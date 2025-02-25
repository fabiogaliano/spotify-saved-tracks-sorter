from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from sentence_transformers import SentenceTransformer
from typing import List, Dict, Any, Optional
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
import json

app = FastAPI(title="Music-Playlist Matcher")

# Load the sentence transformer model
model = SentenceTransformer("intfloat/multilingual-e5-large-instruct")

class AnalysisRequest(BaseModel):
    analyses: List[Dict[str, Any]]

class MatchRequest(BaseModel):
    playlist: Dict[str, Any]
    songs: List[Dict[str, Any]]

def create_playlist_vector_query(playlist_data: Dict[str, Any]) -> str:
    """Create a comprehensive query for playlist embedding with higher emphasis on themes and mood."""
    # Extract playlist metadata
    playlist_id = playlist_data.get("id", "")
    track_count = len(playlist_data.get("track_ids", []))
    
    # Extract meaning elements
    meaning = playlist_data.get("meaning", {})
    themes = meaning.get("themes", [])
    theme_names = ", ".join([t.get("name", "") for t in themes if "name" in t])
    
    # Enhance theme descriptions with more repetition for emphasis
    theme_descriptions = []
    for t in themes:
        if "description" in t:
            # Repeat high confidence themes more often for emphasis
            repeat_count = max(1, int(t.get("confidence", 0.5) * 3))
            for _ in range(repeat_count):
                theme_descriptions.append(t.get("description", ""))
    
    theme_description_text = " ".join(theme_descriptions)
    main_message = meaning.get("main_message", "")
    
    # Extract emotional elements
    emotional = playlist_data.get("emotional", {})
    dominant_mood = emotional.get("dominantMood", {}).get("mood", "")
    mood_description = emotional.get("dominantMood", {}).get("description", "")
    intensity = emotional.get("intensity_score", 0)
    
    # Extract context elements
    context = playlist_data.get("context", {})
    primary_setting = context.get("primary_setting", "")
    perfect_for = ", ".join(context.get("situations", {}).get("perfect_for", []))
    why = context.get("situations", {}).get("why", "")
    
    # Build enhanced query with theme repetition and stronger emphasis
    query = "Instruct: Find songs that match this playlist's exact themes and mood.\n\n"
    
    # Add stronger emphasis on playlist qualities
    query += f"IMPORTANT PLAYLIST THEMES: {theme_names.upper()}\n\n"
    
    if main_message:
        query += f"ESSENTIAL MESSAGE: {main_message}\n\n"
    
    # Create a more detailed emotional section
    query += "EMOTIONAL PROFILE (CRITICAL FOR MATCHING):\n"
    if dominant_mood:
        query += f"Must have this mood: {dominant_mood.upper()}\n"
    if mood_description:
        query += f"Mood details: {mood_description}\n"
    if intensity:
        query += f"With emotional intensity level: {intensity}\n"
    
    # Repeat theme descriptions for emphasis
    if theme_description_text:
        query += f"\nTHEME DETAILS (MUST MATCH):\n{theme_description_text}\n"
    
    # Context is still important but secondary
    query += "\nLISTENING CONTEXT:\n"
    if primary_setting:
        query += f"Setting: {primary_setting}\n"
    if perfect_for:
        query += f"Activities: {perfect_for}\n"
    if why:
        query += f"Reason: {why}\n"
    
    # Add fit scores with less emphasis
    fit_scores = context.get("fit_scores", {})
    if fit_scores:
        query += f"\nTime contexts: morning ({fit_scores.get('morning', 0)}), "
        query += f"working ({fit_scores.get('working', 0)}), "
        query += f"relaxation ({fit_scores.get('relaxation', 0)})\n"
    
    return query

def create_song_vector_query(song_analysis: Dict[str, Any]) -> str:
    """Create a comprehensive query for song embedding with enhanced theme detection."""
    analysis = song_analysis.get("analysis", song_analysis)
    
    # Extract meaning elements
    meaning = analysis.get("meaning", {})
    themes = meaning.get("themes", [])
    theme_names = ", ".join([t.get("name", "") for t in themes if "name" in t])
    theme_descriptions = " ".join([t.get("description", "") for t in themes if "description" in t])
    main_message = meaning.get("interpretation", {}).get("main_message", "")
    if not main_message and "main_message" in meaning:
        main_message = meaning.get("main_message", "")
    
    # Extract emotional elements
    emotional = analysis.get("emotional", {})
    dominant_mood = emotional.get("dominantMood", {}).get("mood", "")
    mood_description = emotional.get("dominantMood", {}).get("description", "")
    intensity = emotional.get("intensity_score", 0)
    
    # Extract lyrical content if available (add this field to your song analysis)
    lyrics_summary = analysis.get("lyrics_summary", "")
    
    # Build enhanced query
    query = "Instruct: Analyze this song's themes and mood for accurate playlist matching.\n\n"
    
    # Add track info if available
    track = song_analysis.get("track", {})
    if track:
        artist = track.get("artist", "")
        title = track.get("title", "")
        if artist and title:
            query += f"Song: {title} by {artist}\n\n"
    
    # Themes section with greater emphasis
    query += "THEMES AND MEANING:\n"
    if theme_names:
        query += f"Primary themes: {theme_names.upper()}\n"
    if main_message:
        query += f"Main message: {main_message}\n"
    if theme_descriptions:
        query += f"Theme details: {theme_descriptions}\n"
    
    # Emotional section with equal emphasis
    query += "\nEMOTIONAL PROFILE:\n"
    if dominant_mood:
        query += f"Primary mood: {dominant_mood.upper()}\n"
    if mood_description:
        query += f"Mood description: {mood_description}\n"
    if intensity:
        query += f"Emotional intensity: {intensity}\n"
    
    # Add lyrics summary if available
    if lyrics_summary:
        query += f"\nLYRICS SUMMARY: {lyrics_summary}\n"
    
    # Context with lower emphasis
    context = analysis.get("context", {})
    primary_setting = context.get("primary_setting", "")
    perfect_for = ", ".join(context.get("situations", {}).get("perfect_for", []))
    
    if primary_setting or perfect_for:
        query += "\nLISTENING CONTEXT:\n"
        if primary_setting:
            query += f"Setting: {primary_setting}\n"
        if perfect_for:
            query += f"Activities: {perfect_for}\n"
    
    return query

# New helper functions for improved matching

def extract_aspect_text(data: Dict[str, Any], aspect: str) -> str:
    """Extract text for a specific aspect (themes, mood, context) from playlist or song data."""
    if aspect == "themes":
        meaning = data.get("meaning", {})
        themes = meaning.get("themes", [])
        theme_descriptions = " ".join([t.get("description", "") for t in themes if "description" in t])
        theme_names = ", ".join([t.get("name", "") for t in themes if "name" in t])
        main_message = meaning.get("main_message", "")
        if not main_message and "interpretation" in meaning:
            main_message = meaning.get("interpretation", {}).get("main_message", "")
        
        text = f"Themes: {theme_names}. "
        if theme_descriptions:
            text += f"Theme details: {theme_descriptions}. "
        if main_message:
            text += f"Main message: {main_message}"
        return text
    
    elif aspect == "mood":
        emotional = data.get("emotional", {})
        dominant_mood = emotional.get("dominantMood", {}).get("mood", "")
        mood_description = emotional.get("dominantMood", {}).get("description", "")
        intensity = emotional.get("intensity_score", 0)
        
        text = f"Mood: {dominant_mood}. "
        if mood_description:
            text += f"Mood description: {mood_description}. "
        if intensity:
            text += f"Emotional intensity: {intensity}"
        return text
    
    elif aspect == "context":
        context = data.get("context", {})
        primary_setting = context.get("primary_setting", "")
        perfect_for = ", ".join(context.get("situations", {}).get("perfect_for", []))
        why = context.get("situations", {}).get("why", "")
        
        text = ""
        if primary_setting:
            text += f"Setting: {primary_setting}. "
        if perfect_for:
            text += f"Perfect for: {perfect_for}. "
        if why:
            text += f"Why: {why}"
        return text
    
    return ""

def check_mood_compatibility(playlist_mood: str, song_mood: str) -> float:
    """Checks if the playlist mood and song mood are compatible using the model."""
    # Create a prompt to check mood compatibility
    prompt = f"Question: Are these two moods compatible, complementary, or similar in feeling: '{playlist_mood}' and '{song_mood}'? Answer with only Yes or No."
    
    # Get embedding for the prompt
    prompt_embedding = model.encode(prompt, normalize_embeddings=True).reshape(1, -1)
    
    # Get embeddings for yes and no responses
    yes_embedding = model.encode("Yes", normalize_embeddings=True).reshape(1, -1)
    no_embedding = model.encode("No", normalize_embeddings=True).reshape(1, -1)
    
    # Compare similarities
    yes_similarity = float(cosine_similarity(prompt_embedding, yes_embedding)[0][0])
    no_similarity = float(cosine_similarity(prompt_embedding, no_embedding)[0][0])
    
    # Calculate compatibility score (higher if more similar to "yes")
    if yes_similarity > no_similarity:
        compatibility = yes_similarity / (yes_similarity + no_similarity)
    else:
        # Apply a penalty if moods are incompatible
        compatibility = 0.3 * (yes_similarity / (yes_similarity + no_similarity))
    
    return compatibility

def calculate_intensity_match(playlist_intensity: float, song_intensity: float) -> float:
    """Calculate how well the intensity levels match (0-1 scale)."""
    # Convert to float to ensure correct calculation
    p_intensity = float(playlist_intensity) if playlist_intensity else 0.5
    s_intensity = float(song_intensity) if song_intensity else 0.5
    
    # Calculate the difference (normalized to 0-1 where 1 = perfect match)
    intensity_diff = 1.0 - abs(p_intensity - s_intensity)
    return intensity_diff

@app.post("/vectorize/song")
async def vectorize_song(request: AnalysisRequest) -> Dict[str, Any]:
    """Generate embeddings for song analyses optimized for playlist matching."""
    try:
        results = []
        
        for song_analysis in request.analyses:
            # Generate query from song analysis
            query = create_song_vector_query(song_analysis)
            
            # Create embedding
            embedding = model.encode(query, normalize_embeddings=True).tolist()
            
            # Get track info if available
            track_info = song_analysis.get("track", {})
            
            # Extract aspect-specific text and create separate embeddings
            themes_text = extract_aspect_text(song_analysis.get("analysis", song_analysis), "themes")
            mood_text = extract_aspect_text(song_analysis.get("analysis", song_analysis), "mood")
            context_text = extract_aspect_text(song_analysis.get("analysis", song_analysis), "context")
            
            theme_embedding = model.encode(themes_text, normalize_embeddings=True).tolist() if themes_text else None
            mood_embedding = model.encode(mood_text, normalize_embeddings=True).tolist() if mood_text else None
            context_embedding = model.encode(context_text, normalize_embeddings=True).tolist() if context_text else None
            
            result = {
                "embedding": embedding,  # Keep original embedding for backward compatibility
                "aspect_embeddings": {
                    "theme": theme_embedding,
                    "mood": mood_embedding,
                    "context": context_embedding
                },
                "track_info": track_info
            }
            
            results.append(result)
        
        return {"results": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/vectorize/playlist")
async def vectorize_playlist(request: Dict[str, Any]) -> Dict[str, Any]:
    """Generate embeddings for a playlist optimized for song matching."""
    try:
        playlist_data = request.get("playlist", request)
        
        # Generate query from playlist data
        query = create_playlist_vector_query(playlist_data)
        
        # Create main embedding
        embedding = model.encode(query, normalize_embeddings=True).tolist()
        
        # Extract aspect-specific text and create separate embeddings
        themes_text = extract_aspect_text(playlist_data, "themes")
        mood_text = extract_aspect_text(playlist_data, "mood")
        context_text = extract_aspect_text(playlist_data, "context")
        
        theme_embedding = model.encode(themes_text, normalize_embeddings=True).tolist() if themes_text else None
        mood_embedding = model.encode(mood_text, normalize_embeddings=True).tolist() if mood_text else None
        context_embedding = model.encode(context_text, normalize_embeddings=True).tolist() if context_text else None
        
        # Return the embeddings with playlist info
        return {
            "embedding": embedding,  # Keep original embedding for backward compatibility
            "aspect_embeddings": {
                "theme": theme_embedding,
                "mood": mood_embedding,
                "context": context_embedding
            },
            "playlist_id": playlist_data.get("id", ""),
            "track_count": len(playlist_data.get("track_ids", []))
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/match/songs-to-playlist")
async def match_songs_to_playlist(request: MatchRequest) -> Dict[str, Any]:
    """Match songs to a playlist using aspect-specific matching."""
    try:
        playlist_data = request.playlist
        songs_data = request.songs
        
        # 1. Generate separate aspect embeddings for playlist
        playlist_themes_text = extract_aspect_text(playlist_data, "themes")
        playlist_mood_text = extract_aspect_text(playlist_data, "mood")
        playlist_context_text = extract_aspect_text(playlist_data, "context")
        
        playlist_theme_emb = model.encode(playlist_themes_text, normalize_embeddings=True).reshape(1, -1) if playlist_themes_text else None
        playlist_mood_emb = model.encode(playlist_mood_text, normalize_embeddings=True).reshape(1, -1) if playlist_mood_text else None
        playlist_context_emb = model.encode(playlist_context_text, normalize_embeddings=True).reshape(1, -1) if playlist_context_text else None
        
        # 2. For backward compatibility, also generate the combined embedding
        playlist_query = create_playlist_vector_query(playlist_data)
        playlist_embedding = model.encode(playlist_query, normalize_embeddings=True).reshape(1, -1)
        
        # Get playlist mood for compatibility checks
        playlist_mood = playlist_data.get("emotional", {}).get("dominantMood", {}).get("mood", "")
        playlist_intensity = playlist_data.get("emotional", {}).get("intensity_score", 0.5)
        
        matches = []
        for song in songs_data:
            song_analysis = song.get("analysis", song)
            
            # 3. Generate separate aspect embeddings for each song
            song_themes_text = extract_aspect_text(song_analysis, "themes")
            song_mood_text = extract_aspect_text(song_analysis, "mood")
            song_context_text = extract_aspect_text(song_analysis, "context")
            
            song_theme_emb = model.encode(song_themes_text, normalize_embeddings=True).reshape(1, -1) if song_themes_text else None
            song_mood_emb = model.encode(song_mood_text, normalize_embeddings=True).reshape(1, -1) if song_mood_text else None
            song_context_emb = model.encode(song_context_text, normalize_embeddings=True).reshape(1, -1) if song_context_text else None
            
            # 4. Calculate aspect-specific similarities
            theme_similarity = float(cosine_similarity(playlist_theme_emb, song_theme_emb)[0][0]) if playlist_theme_emb is not None and song_theme_emb is not None else 0.5
            mood_similarity = float(cosine_similarity(playlist_mood_emb, song_mood_emb)[0][0]) if playlist_mood_emb is not None and song_mood_emb is not None else 0.5
            context_similarity = float(cosine_similarity(playlist_context_emb, song_context_emb)[0][0]) if playlist_context_emb is not None and song_context_emb is not None else 0.5
            
            # 5. Calculate overall similarity (legacy method)
            song_query = create_song_vector_query(song)
            song_embedding = model.encode(song_query, normalize_embeddings=True).reshape(1, -1)
            overall_similarity = float(cosine_similarity(playlist_embedding, song_embedding)[0][0])
            
            # 6. Check mood compatibility
            song_mood = song_analysis.get("emotional", {}).get("dominantMood", {}).get("mood", "")
            song_intensity = song_analysis.get("emotional", {}).get("intensity_score", 0.5)
            
            mood_compatibility = check_mood_compatibility(playlist_mood, song_mood) if playlist_mood and song_mood else 0.5
            intensity_match = calculate_intensity_match(playlist_intensity, song_intensity)
            
            # 7. Apply weighted scoring (adjustable weights)
            # Higher weight for mood compatibility to prevent mismatches
            theme_weight = 0.25
            mood_weight = 0.25
            mood_compatibility_weight = 0.35
            context_weight = 0.05
            intensity_weight = 0.1
            
            weighted_score = (
                theme_similarity * theme_weight +
                mood_similarity * mood_weight +
                mood_compatibility * mood_compatibility_weight +
                context_similarity * context_weight +
                intensity_match * intensity_weight
            )
            
            # Get track info
            track_info = song.get("track", {})
            
            matches.append({
                "track_info": track_info,
                "similarity": weighted_score,  # Use weighted score as primary similarity
                "overall_similarity": overall_similarity,  # Include legacy similarity for reference
                "component_scores": {
                    "theme_similarity": theme_similarity,
                    "mood_similarity": mood_similarity,
                    "mood_compatibility": mood_compatibility,
                    "context_similarity": context_similarity,
                    "intensity_match": intensity_match
                }
            })
        
        # Sort by similarity (highest first)
        matches.sort(key=lambda x: x["similarity"], reverse=True)
        
        return {
            "playlist_id": playlist_data.get("id", ""),
            "matches": matches
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/")
async def root():
    """Root endpoint that provides API information."""
    return {
        "service": "Music-Playlist Matcher",
        "version": "2.0.0",
        "endpoints": {
            "/vectorize/song": "Generate embeddings for songs",
            "/vectorize/playlist": "Generate embeddings for playlists",
            "/match/songs-to-playlist": "Match songs to a playlist",
            "/": "This information"
        }
    }

if __name__ == "__main__":
    import uvicorn
    PORT = 8000
    print(f"🚀 Server starting on http://localhost:{PORT}")
    uvicorn.run(app, host="0.0.0.0", port=PORT)