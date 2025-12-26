#!/usr/bin/env python3
"""
Dynamic Music Matching Algorithm
--------------------------------
This module implements a flexible, adaptive matching algorithm that:
1. Dynamically determines the most important aspects of a playlist
2. Adapts weights based on playlist characteristics
3. Avoids fixed categories for moods and themes
4. Uses contextual understanding for better matching
"""

import json
import numpy as np
from typing import Dict, List, Any, Tuple, Optional
import torch
import torch.nn.functional as F
from transformers import AutoTokenizer, AutoModel
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.cluster import DBSCAN
import matplotlib.pyplot as plt
import seaborn as sns

# Load model
print("Loading matching model...")
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

def extract_key_aspects(playlist: Dict[str, Any]) -> Dict[str, float]:
    """
    Dynamically determine the key aspects of a playlist and their importance
    Returns a dictionary of aspect weights
    """
    aspects = {
        "theme": 0.0,
        "mood": 0.0,
        "activity": 0.0,
        "intensity": 0.0
    }
    
    # Check for strong thematic focus
    if playlist.get("meaning", {}).get("themes"):
        themes = playlist["meaning"]["themes"]
        theme_confidence = sum(t.get("confidence", 0.5) for t in themes) / len(themes) if themes else 0
        aspects["theme"] = min(1.0, theme_confidence * 1.2)  # Boost theme importance slightly
    
    # Check for strong mood focus
    if playlist.get("emotional", {}).get("dominant_mood"):
        mood = playlist["emotional"]["dominant_mood"]
        if mood.get("mood") and mood.get("description"):
            # Longer mood descriptions indicate stronger mood focus
            mood_strength = min(1.0, len(mood.get("description", "")) / 100)
            aspects["mood"] = max(0.6, mood_strength)  # Ensure mood has at least moderate importance
    
    # Check for activity focus
    if playlist.get("context", {}).get("situations", {}).get("perfect_for"):
        activities = playlist["context"]["situations"]["perfect_for"]
        if activities:
            aspects["activity"] = min(1.0, len(activities) / 5 * 0.8)  # Scale by number of activities
    
    # Check for intensity focus
    if playlist.get("emotional", {}).get("intensity_score") is not None:
        # If intensity is explicitly specified, it's likely important
        aspects["intensity"] = 0.5
    
    # Normalize weights to sum to 1.0
    total = sum(aspects.values())
    if total > 0:
        for aspect in aspects:
            aspects[aspect] /= total
    else:
        # Default to balanced weights if no clear focus
        for aspect in aspects:
            aspects[aspect] = 0.25
    
    return aspects

def create_contextual_embedding(item: Dict[str, Any], aspect: str) -> np.ndarray:
    """
    Create a contextual embedding for a specific aspect of a song or playlist
    """
    if aspect == "theme":
        themes = item.get("meaning", {}).get("themes", [])
        if not themes:
            return np.zeros(384)  # Default embedding size
        
        # Combine theme names and descriptions
        theme_texts = [f"{t.get('name', '')} {t.get('description', '')}" for t in themes]
        combined_text = " ".join(theme_texts)
        
        return get_embedding(combined_text)
    
    elif aspect == "mood":
        mood = item.get("emotional", {}).get("dominant_mood", {})
        if not mood:
            return np.zeros(384)
        
        mood_text = f"{mood.get('mood', '')} {mood.get('description', '')}"
        return get_embedding(mood_text)
    
    elif aspect == "activity":
        activities = item.get("context", {}).get("situations", {}).get("perfect_for", [])
        if not activities:
            return np.zeros(384)
        
        activity_text = " ".join(activities)
        return get_embedding(activity_text)
    
    elif aspect == "intensity":
        # For intensity, we use a combination of mood and emotional progression
        mood = item.get("emotional", {}).get("dominant_mood", {})
        progression = item.get("emotional", {}).get("progression", [])
        
        intensity_text = f"{mood.get('mood', '')} {mood.get('description', '')}"
        if progression:
            intensity_text += " " + " ".join([p.get("mood", "") for p in progression])
        
        return get_embedding(intensity_text)
    
    # Default case
    return np.zeros(384)

def detect_contradictions(
    playlist_embedding: np.ndarray,
    song_embedding: np.ndarray,
    aspect: str
) -> Dict[str, Any]:
    """
    Detect contradictions between playlist and song for a specific aspect
    Returns contradiction score and explanation
    """
    similarity = float(cosine_similarity([playlist_embedding], [song_embedding])[0][0])
    
    # Convert similarity to contradiction score (0 = no contradiction, 1 = complete contradiction)
    # Using a non-linear transformation to emphasize strong contradictions
    contradiction_score = max(0, 1 - similarity)
    
    # Generate explanation based on contradiction level
    if contradiction_score < 0.2:
        explanation = f"No significant {aspect} contradiction detected."
    elif contradiction_score < 0.4:
        explanation = f"Minor {aspect} contradiction detected."
    elif contradiction_score < 0.6:
        explanation = f"Moderate {aspect} contradiction detected."
    elif contradiction_score < 0.8:
        explanation = f"Significant {aspect} contradiction detected."
    else:
        explanation = f"Major {aspect} contradiction detected. These {aspect}s are opposites."
    
    return {
        "score": contradiction_score,
        "explanation": explanation
    }

def calculate_aspect_similarity(
    playlist_embedding: np.ndarray,
    song_embedding: np.ndarray
) -> float:
    """Calculate similarity between two aspect embeddings"""
    if np.all(playlist_embedding == 0) or np.all(song_embedding == 0):
        return 0.5  # Default to neutral if either embedding is empty
    
    return float(cosine_similarity([playlist_embedding], [song_embedding])[0][0])

def match_song_to_playlist(
    playlist: Dict[str, Any],
    song: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Match a song to a playlist using dynamic weighting and contextual understanding
    Returns detailed match results
    """
    # Extract key aspects and their importance
    aspect_weights = extract_key_aspects(playlist)
    
    # Create embeddings for each aspect
    playlist_embeddings = {}
    song_embeddings = {}
    
    for aspect in aspect_weights:
        playlist_embeddings[aspect] = create_contextual_embedding(playlist, aspect)
        song_embeddings[aspect] = create_contextual_embedding(song["analysis"], aspect)
    
    # Calculate similarity for each aspect
    aspect_similarities = {}
    contradictions = {}
    
    for aspect, weight in aspect_weights.items():
        if weight > 0:
            # Calculate similarity
            similarity = calculate_aspect_similarity(
                playlist_embeddings[aspect],
                song_embeddings[aspect]
            )
            aspect_similarities[aspect] = similarity
            
            # Detect contradictions
            contradiction = detect_contradictions(
                playlist_embeddings[aspect],
                song_embeddings[aspect],
                aspect
            )
            contradictions[aspect] = contradiction
    
    # Calculate weighted similarity
    weighted_similarity = sum(
        aspect_similarities[aspect] * weight 
        for aspect, weight in aspect_weights.items() 
        if aspect in aspect_similarities
    )
    
    # Apply contradiction penalties
    # We use a multiplicative penalty to ensure contradictions have a strong effect
    contradiction_penalty = 1.0
    for aspect, contradiction in contradictions.items():
        # Only apply significant penalties for important aspects
        if aspect_weights[aspect] > 0.2 and contradiction["score"] > 0.4:
            # Calculate penalty factor based on contradiction score and aspect weight
            penalty_factor = contradiction["score"] * aspect_weights[aspect] * 0.8
            contradiction_penalty *= (1 - penalty_factor)
    
    # Apply penalty to final score
    final_score = weighted_similarity * contradiction_penalty
    
    # Generate explanation
    explanation = generate_match_explanation(
        aspect_weights,
        aspect_similarities,
        contradictions,
        final_score
    )
    
    return {
        "track_info": song["track"],
        "final_score": final_score,
        "aspect_weights": aspect_weights,
        "aspect_similarities": aspect_similarities,
        "contradictions": contradictions,
        "explanation": explanation
    }

def generate_match_explanation(
    aspect_weights: Dict[str, float],
    aspect_similarities: Dict[str, float],
    contradictions: Dict[str, Dict[str, Any]],
    final_score: float
) -> str:
    """Generate human-readable explanation for match results"""
    # Sort aspects by importance
    sorted_aspects = sorted(aspect_weights.items(), key=lambda x: x[1], reverse=True)
    
    # Start with overall assessment
    if final_score > 0.8:
        explanation = "Excellent match. "
    elif final_score > 0.6:
        explanation = "Good match. "
    elif final_score > 0.4:
        explanation = "Moderate match. "
    else:
        explanation = "Poor match. "
    
    # Add details about most important aspects
    important_aspects = [a for a, w in sorted_aspects if w > 0.2]
    
    if important_aspects:
        explanation += "Key factors: "
        
        for i, aspect in enumerate(important_aspects):
            similarity = aspect_similarities.get(aspect, 0)
            contradiction = contradictions.get(aspect, {}).get("score", 0)
            
            if i > 0:
                explanation += ", "
            
            if similarity > 0.7 and contradiction < 0.3:
                explanation += f"strong {aspect} alignment"
            elif similarity > 0.5 and contradiction < 0.4:
                explanation += f"good {aspect} compatibility"
            elif contradiction > 0.5:
                explanation += f"significant {aspect} contradiction"
            else:
                explanation += f"neutral {aspect} relationship"
    
    # Add information about contradictions if they exist
    significant_contradictions = [
        (aspect, details) for aspect, details in contradictions.items()
        if details["score"] > 0.5 and aspect_weights[aspect] > 0.2
    ]
    
    if significant_contradictions:
        explanation += " Warning: "
        explanation += ", ".join([f"{aspect} contradiction" for aspect, _ in significant_contradictions])
    
    return explanation

def match_songs_to_playlist(
    playlist: Dict[str, Any],
    songs: List[Dict[str, Any]]
) -> List[Dict[str, Any]]:
    """
    Match multiple songs to a playlist
    Returns sorted match results
    """
    results = []
    
    for song in songs:
        match_result = match_song_to_playlist(playlist, song)
        results.append(match_result)
    
    # Sort by final score (descending)
    results.sort(key=lambda x: x["final_score"], reverse=True)
    
    return results

def visualize_matches(match_results: List[Dict[str, Any]], output_file: str = None):
    """
    Visualize match results with detailed breakdown
    """
    # Extract data for visualization
    songs = [f"{r['track_info']['artist']} - {r['track_info']['title']}" for r in match_results]
    scores = [r["final_score"] for r in match_results]
    
    # Get aspect data
    aspects = list(match_results[0]["aspect_weights"].keys())
    aspect_data = {
        aspect: [r["aspect_similarities"].get(aspect, 0) * r["aspect_weights"].get(aspect, 0) 
                for r in match_results]
        for aspect in aspects
    }
    
    # Create stacked bar chart
    plt.figure(figsize=(12, 8))
    
    # Plot total scores
    plt.barh(songs, scores, color='blue', alpha=0.3, label='Final Score')
    
    # Plot aspect contributions
    left = np.zeros(len(songs))
    for aspect in aspects:
        plt.barh(songs, aspect_data[aspect], left=left, alpha=0.7, label=f'{aspect.capitalize()} Contribution')
        left += np.array(aspect_data[aspect])
    
    plt.xlabel('Match Score')
    plt.title('Song-Playlist Match Scores with Aspect Breakdown')
    plt.legend(loc='lower right')
    plt.tight_layout()
    
    if output_file:
        plt.savefig(output_file)
        print(f"Visualization saved to {output_file}")
    else:
        plt.show()

def test_dynamic_matcher(test_file: str):
    """Test the dynamic matcher with a test file"""
    with open(test_file, 'r') as f:
        test_data = json.load(f)
    
    playlist = test_data["playlist"]
    songs = test_data["songs"]
    
    print(f"Testing dynamic matcher with {len(songs)} songs...")
    
    # Match songs to playlist
    match_results = match_songs_to_playlist(playlist, songs)
    
    # Print results
    print("\nMatch Results:")
    print("-" * 80)
    
    for i, result in enumerate(match_results):
        print(f"{i+1}. {result['track_info']['artist']} - {result['track_info']['title']}")
        print(f"   Score: {result['final_score']:.2f}")
        print(f"   {result['explanation']}")
        print("-" * 80)
    
    # Visualize results
    visualize_matches(match_results, "dynamic_matcher_results.png")
    
    return match_results

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python dynamic_matcher.py <test_file>")
        sys.exit(1)
    
    test_file = sys.argv[1]
    test_dynamic_matcher(test_file)
