#!/usr/bin/env python3
"""
Model Evaluation Script for Music Matching
------------------------------------------
This script tests different embedding models for music matching tasks.
It compares their performance on song-playlist matching tasks.

Usage:
    bun run model_evaluation.py --model_name <model_name> --test_data <test_data_path>

Models to try:
- sentence-transformers/all-MiniLM-L6-v2 (current default, best performing)
- sentence-transformers/all-mpnet-base-v2
- intfloat/multilingual-e5-large-instruct (previous model)
- mixedbread-ai/mxbai-embed-large-v1
- thenlper/gte-large
"""

import argparse
import json
import os
import time
import numpy as np
from typing import Dict, List, Any, Tuple
import torch
import torch.nn.functional as F
from transformers import AutoTokenizer, AutoModel
from sklearn.metrics.pairwise import cosine_similarity
import matplotlib.pyplot as plt
import seaborn as sns

# Suppress warnings
import warnings
warnings.filterwarnings("ignore")

# Set up argument parser
parser = argparse.ArgumentParser(description="Evaluate embedding models for music matching")
parser.add_argument("--model_name", type=str, default="sentence-transformers/all-MiniLM-L6-v2",
                    help="Model to evaluate")
parser.add_argument("--test_data", type=str, 
                    default="./test_data.json",
                    help="Path to test data JSON")
parser.add_argument("--output_dir", type=str, default="./model_evaluation_results",
                    help="Directory to save results")
args = parser.parse_args()

# Ensure output directory exists
os.makedirs(args.output_dir, exist_ok=True)

# Load model
print(f"Loading model: {args.model_name}")
tokenizer = AutoTokenizer.from_pretrained(args.model_name)
model = AutoModel.from_pretrained(args.model_name)

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

def create_song_vector_query(song_analysis: Dict[str, Any]) -> str:
    """Create a comprehensive query for song embedding"""
    # Extract key information
    themes = song_analysis.get("meaning", {}).get("themes", [])
    mood = song_analysis.get("emotional", {}).get("dominant_mood", {})
    
    # Build query components
    theme_descriptions = [f"Theme: {t.get('name', '')} - {t.get('description', '')}" 
                         for t in themes if t.get('name')]
    
    mood_text = f"Mood: {mood.get('mood', '')} - {mood.get('description', '')}" if mood else ""
    
    # Combine all components
    query_parts = theme_descriptions + [mood_text]
    query = " ".join([part for part in query_parts if part])
    
    return query

def create_playlist_vector_query(playlist_data: Dict[str, Any]) -> str:
    """Create a comprehensive query for playlist embedding"""
    # Extract key information
    themes = playlist_data.get("meaning", {}).get("themes", [])
    mood = playlist_data.get("emotional", {}).get("dominant_mood", {})
    
    # Build query components
    theme_descriptions = [f"Theme: {t.get('name', '')} - {t.get('description', '')}" 
                         for t in themes if t.get('name')]
    
    mood_text = f"Mood: {mood.get('mood', '')} - {mood.get('description', '')}" if mood else ""
    
    # Combine all components
    query_parts = theme_descriptions + [mood_text]
    query = " ".join([part for part in query_parts if part])
    
    return query

def calculate_similarity(vec1: np.ndarray, vec2: np.ndarray) -> float:
    """Calculate cosine similarity between two vectors"""
    return float(cosine_similarity([vec1], [vec2])[0][0])

def evaluate_model(test_data: Dict[str, Any]) -> Dict[str, Any]:
    """Evaluate model on test data"""
    results = {
        "model_name": args.model_name,
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
        "matches": []
    }
    
    # Get playlist data
    playlist = test_data["playlist"]
    playlist_query = create_playlist_vector_query(playlist)
    playlist_embedding = get_embedding(playlist_query)
    
    # Process each song
    for song in test_data["songs"]:
        song_query = create_song_vector_query(song["analysis"])
        song_embedding = get_embedding(song_query)
        
        # Calculate similarity
        similarity = calculate_similarity(playlist_embedding, song_embedding)
        
        # Store result
        results["matches"].append({
            "track": song["track"],
            "similarity": similarity,
            "ground_truth": song.get("ground_truth", {})
        })
    
    # Sort by similarity
    results["matches"].sort(key=lambda x: x["similarity"], reverse=True)
    
    return results

def visualize_results(results: Dict[str, Any]) -> None:
    """Visualize model evaluation results"""
    # Extract data for plotting
    tracks = [f"{m['track']['artist']} - {m['track']['title']}" for m in results["matches"]]
    similarities = [m["similarity"] for m in results["matches"]]
    ground_truth = [m.get("ground_truth", {}).get("score", 0) for m in results["matches"]]
    
    # Create figure
    plt.figure(figsize=(12, 8))
    
    # Plot similarities
    plt.barh(tracks, similarities, color='blue', alpha=0.6, label='Model Score')
    
    # Plot ground truth if available
    if any(ground_truth):
        plt.barh(tracks, ground_truth, color='green', alpha=0.4, label='Ground Truth')
    
    plt.xlabel('Similarity Score')
    plt.title(f'Model Evaluation: {args.model_name}')
    plt.legend()
    plt.tight_layout()
    
    # Save figure
    output_path = os.path.join(args.output_dir, f"{args.model_name.replace('/', '_')}_results.png")
    plt.savefig(output_path)
    print(f"Visualization saved to {output_path}")

def create_test_data_template():
    """Create a template for test data"""
    template = {
        "playlist": {
            "id": "test_playlist",
            "meaning": {
                "themes": [
                    {
                        "name": "Self-Care & Rejuvenation",
                        "description": "The playlist is centered around the act of taking care of oneself."
                    }
                ]
            },
            "emotional": {
                "dominant_mood": {
                    "mood": "Uplifting & Empowering",
                    "description": "The playlist has an uplifting and empowering emotional tone."
                }
            }
        },
        "songs": [
            {
                "track": {
                    "artist": "Artist Name",
                    "title": "Song Title"
                },
                "analysis": {
                    "meaning": {
                        "themes": [
                            {
                                "name": "Theme Name",
                                "description": "Theme description"
                            }
                        ]
                    },
                    "emotional": {
                        "dominant_mood": {
                            "mood": "Mood Name",
                            "description": "Mood description"
                        }
                    }
                },
                "ground_truth": {
                    "score": 0.8,
                    "notes": "This song matches well with the playlist"
                }
            }
        ]
    }
    
    with open("test_data_template.json", "w") as f:
        json.dump(template, f, indent=2)
    
    print("Test data template created: test_data_template.json")

def main():
    # Check if test data exists
    if not os.path.exists(args.test_data):
        print(f"Test data not found at {args.test_data}")
        create_test_data_template()
        return
    
    # Load test data
    with open(args.test_data, "r") as f:
        test_data = json.load(f)
    
    # Evaluate model
    print(f"Evaluating model on {len(test_data['songs'])} songs...")
    results = evaluate_model(test_data)
    
    # Save results
    output_path = os.path.join(args.output_dir, f"{args.model_name.replace('/', '_')}_results.json")
    with open(output_path, "w") as f:
        json.dump(results, f, indent=2)
    
    print(f"Results saved to {output_path}")
    
    # Visualize results
    visualize_results(results)
    
    # Print top matches
    print("\nTop matches:")
    for i, match in enumerate(results["matches"][:5]):
        print(f"{i+1}. {match['track']['artist']} - {match['track']['title']}: {match['similarity']:.4f}")

if __name__ == "__main__":
    main()
