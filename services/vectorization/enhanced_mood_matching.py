#!/usr/bin/env python3
"""
Enhanced Mood Matching Module
-----------------------------
This module implements improved mood matching algorithms that go beyond
simple keyword matching to provide more nuanced emotional understanding.
"""

import json
import numpy as np
from typing import Dict, List, Any, Tuple, Optional
import torch
import torch.nn.functional as F
from transformers import AutoTokenizer, AutoModel
from sklearn.metrics.pairwise import cosine_similarity

# Load models
print("Loading mood matching models...")
model_name = "sentence-transformers/all-MiniLM-L6-v2"  # Better performing model
tokenizer = AutoTokenizer.from_pretrained(model_name)
model = AutoModel.from_pretrained(model_name)

# Move model to GPU if available
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
model = model.to(device)
print(f"Using device: {device}")

def mean_pooling(model_output, attention_mask):
    """Mean pooling to get sentence embeddings"""
    token_embeddings = model_output[0] # First element of model_output contains all token embeddings
    input_mask_expanded = attention_mask.unsqueeze(-1).expand(token_embeddings.size()).float()
    return torch.sum(token_embeddings * input_mask_expanded, 1) / torch.clamp(input_mask_expanded.sum(1), min=1e-9)

def get_embedding(text: str) -> np.ndarray:
    """Get embedding for a text using the loaded model"""
    # Tokenize and get embedding
    encoded_input = tokenizer(text, padding=True, truncation=True, max_length=512, return_tensors='pt').to(device)
    with torch.no_grad():
        model_output = model(**encoded_input)
    
    # Perform pooling
    embedding = mean_pooling(model_output, encoded_input['attention_mask'])
    
    # Normalize embeddings
    embedding = F.normalize(embedding, p=2, dim=1)
    
    return embedding.cpu().numpy()[0]

# Define emotional dimensions for a more nuanced understanding
EMOTIONAL_DIMENSIONS = {
    "valence": {  # Positive vs. Negative
        "positive": ["happy", "joyful", "uplifting", "optimistic", "cheerful", "hopeful", "content", "satisfied", "peaceful"],
        "negative": ["sad", "melancholy", "depressing", "gloomy", "angry", "frustrated", "anxious", "fearful", "resentful"]
    },
    "arousal": {  # High energy vs. Low energy
        "high": ["energetic", "exciting", "intense", "powerful", "dynamic", "lively", "passionate", "vigorous"],
        "low": ["calm", "relaxing", "soothing", "gentle", "mellow", "tranquil", "serene", "peaceful"]
    },
    "dominance": {  # Empowering vs. Vulnerable
        "empowering": ["confident", "strong", "empowering", "bold", "assertive", "determined", "resilient"],
        "vulnerable": ["vulnerable", "sensitive", "intimate", "delicate", "fragile", "uncertain", "insecure"]
    }
}

def analyze_mood_dimensions(mood_text: str) -> Dict[str, Dict[str, float]]:
    """
    Analyze a mood description along multiple emotional dimensions
    Returns scores for each dimension (valence, arousal, dominance)
    """
    results = {}
    mood_text = mood_text.lower()
    
    # Get embedding for the mood text
    mood_embedding = get_embedding(mood_text)
    
    # Analyze each dimension
    for dimension, categories in EMOTIONAL_DIMENSIONS.items():
        results[dimension] = {}
        
        for category, keywords in categories.items():
            # Get embeddings for each keyword
            keyword_embeddings = [get_embedding(keyword) for keyword in keywords]
            
            # Calculate similarity with each keyword
            similarities = [cosine_similarity([mood_embedding], [emb])[0][0] for emb in keyword_embeddings]
            
            # Use max similarity as the score for this category
            results[dimension][category] = float(max(similarities))
    
    return results

def calculate_mood_compatibility(
    playlist_mood: Dict[str, Any],
    song_mood: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Calculate comprehensive mood compatibility between playlist and song
    Returns detailed compatibility scores and explanations
    """
    # Extract mood texts
    playlist_mood_text = f"{playlist_mood.get('mood', '')} {playlist_mood.get('description', '')}"
    song_mood_text = f"{song_mood.get('mood', '')} {song_mood.get('description', '')}"
    
    # Get direct semantic similarity
    playlist_embedding = get_embedding(playlist_mood_text)
    song_embedding = get_embedding(song_mood_text)
    semantic_similarity = float(cosine_similarity([playlist_embedding], [song_embedding])[0][0])
    
    # Analyze dimensional compatibility
    playlist_dimensions = analyze_mood_dimensions(playlist_mood_text)
    song_dimensions = analyze_mood_dimensions(song_mood_text)
    
    # Calculate dimensional compatibility scores
    dimension_scores = {}
    for dimension in EMOTIONAL_DIMENSIONS.keys():
        playlist_dim = playlist_dimensions[dimension]
        song_dim = song_dimensions[dimension]
        
        # Calculate similarity within this dimension
        dimension_scores[dimension] = {
            "playlist": playlist_dim,
            "song": song_dim,
            "compatibility": 1.0 - sum(abs(playlist_dim[cat] - song_dim[cat]) for cat in playlist_dim) / len(playlist_dim)
        }
    
    # Calculate overall compatibility with weighted dimensions
    # Valence (positive/negative) is most important for mood matching
    weights = {"valence": 0.5, "arousal": 0.3, "dominance": 0.2}
    weighted_score = sum(dimension_scores[dim]["compatibility"] * weights[dim] for dim in weights)
    
    # Blend semantic similarity with dimensional analysis
    final_score = 0.6 * semantic_similarity + 0.4 * weighted_score
    
    # Generate explanation
    explanation = generate_mood_explanation(dimension_scores, playlist_mood, song_mood, final_score)
    
    return {
        "score": final_score,
        "semantic_similarity": semantic_similarity,
        "dimension_scores": dimension_scores,
        "explanation": explanation
    }

def generate_mood_explanation(
    dimension_scores: Dict[str, Dict[str, Any]],
    playlist_mood: Dict[str, Any],
    song_mood: Dict[str, Any],
    final_score: float
) -> str:
    """Generate human-readable explanation for mood compatibility"""
    playlist_mood_name = playlist_mood.get('mood', 'Unknown')
    song_mood_name = song_mood.get('mood', 'Unknown')
    
    # Get key differences
    valence_diff = abs(dimension_scores["valence"]["playlist"]["positive"] - 
                       dimension_scores["valence"]["song"]["positive"])
    arousal_diff = abs(dimension_scores["arousal"]["playlist"]["high"] - 
                      dimension_scores["arousal"]["song"]["high"])
    
    # Determine main compatibility factors
    if final_score > 0.8:
        explanation = f"Strong mood compatibility between '{playlist_mood_name}' and '{song_mood_name}'. "
        explanation += "Both share similar emotional qualities."
    elif final_score > 0.6:
        explanation = f"Good mood compatibility between '{playlist_mood_name}' and '{song_mood_name}'. "
        if valence_diff < 0.3:
            explanation += "They share similar emotional valence (positivity/negativity)."
        else:
            explanation += "They have complementary energy levels despite some differences in tone."
    elif final_score > 0.4:
        explanation = f"Moderate mood compatibility between '{playlist_mood_name}' and '{song_mood_name}'. "
        if valence_diff > 0.4:
            explanation += "They differ in emotional tone (positive vs negative)."
        elif arousal_diff > 0.4:
            explanation += "They differ significantly in energy level."
        else:
            explanation += "They have some emotional similarities but differ in key aspects."
    else:
        explanation = f"Low mood compatibility between '{playlist_mood_name}' and '{song_mood_name}'. "
        explanation += "They represent contrasting emotional states."
    
    return explanation

def test_mood_matching(test_file: str = None):
    """Test the mood matching with sample data or provided test file"""
    if test_file:
        with open(test_file, 'r') as f:
            test_data = json.load(f)
    else:
        # Sample test data
        test_data = {
            "playlist_mood": {
                "mood": "Optimistic and Uplifting",
                "description": "Promotes positivity and encourages the listener to feel good about themselves."
            },
            "song_moods": [
                {
                    "mood": "Optimistic and Uplifting",
                    "description": "The song has a warm, sunny disposition that radiates positivity and encouragement."
                },
                {
                    "mood": "Nostalgic Longing",
                    "description": "A bittersweet emotional tone that balances hope with melancholy."
                },
                {
                    "mood": "Melancholy and Reflective",
                    "description": "The song evokes a sense of melancholy due to its somber portrayal of poverty, violence, and moral compromises."
                },
                {
                    "mood": "Resentment",
                    "description": "The song conveys a strong sense of resentment and refusal to conform to others' expectations of healing."
                },
                {
                    "mood": "Anxious Uncertainty",
                    "description": "The song conveys a sense of unease and insecurity about the future of a relationship."
                }
            ]
        }
    
    # Test each song mood against the playlist mood
    playlist_mood = test_data["playlist_mood"]
    results = []
    
    print(f"\nTesting mood compatibility with playlist mood: {playlist_mood['mood']}")
    print("-" * 80)
    
    for i, song_mood in enumerate(test_data["song_moods"]):
        print(f"Testing song mood {i+1}: {song_mood['mood']}")
        compatibility = calculate_mood_compatibility(playlist_mood, song_mood)
        
        results.append({
            "song_mood": song_mood["mood"],
            "compatibility_score": compatibility["score"],
            "explanation": compatibility["explanation"]
        })
        
        print(f"Compatibility score: {compatibility['score']:.2f}")
        print(f"Explanation: {compatibility['explanation']}")
        print("-" * 80)
    
    # Sort results by compatibility score
    results.sort(key=lambda x: x["compatibility_score"], reverse=True)
    
    print("\nRanked Results:")
    for i, result in enumerate(results):
        print(f"{i+1}. {result['song_mood']} - Score: {result['compatibility_score']:.2f}")
    
    return results

if __name__ == "__main__":
    import sys
    test_file = sys.argv[1] if len(sys.argv) > 1 else None
    test_mood_matching(test_file)
