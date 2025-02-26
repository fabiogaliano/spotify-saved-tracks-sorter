from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Dict, List, Optional, Any
import json
import torch
from transformers import AutoTokenizer, AutoModel, AutoModelForSequenceClassification

app = FastAPI(title="Music-Playlist Vectorization API")

# Load models using Transformers library
embedding_tokenizer = AutoTokenizer.from_pretrained("intfloat/multilingual-e5-large-instruct")
embedding_model = AutoModel.from_pretrained("intfloat/multilingual-e5-large-instruct")

# Load multilingual sentiment analysis model
sentiment_tokenizer = AutoTokenizer.from_pretrained("tabularisai/multilingual-sentiment-analysis")
sentiment_model = AutoModelForSequenceClassification.from_pretrained("tabularisai/multilingual-sentiment-analysis")

class AnalysisRequest(BaseModel):
    analyses: List[Dict[str, Any]]

class TextRequest(BaseModel):
    text: str

class SentimentResponse(BaseModel):
    positive: float
    negative: float
    neutral: float

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
    query = "Represent this playlist for music matching:\n\n"
    
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
    query = "Represent this song for music similarity: "
    
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

@app.post("/vectorize/text")
async def vectorize_text(request: TextRequest) -> Dict[str, Any]:
    """Generate embedding for a specific text snippet using Transformers."""
    try:
        # Add instruction prefix for E5 model
        instruction_text = f"Represent this text for music similarity: {request.text}"
        
        # Tokenize and get model inputs
        inputs = embedding_tokenizer(instruction_text, padding=True, truncation=True, 
                                   return_tensors="pt", max_length=512)
        
        # Generate embeddings
        with torch.no_grad():
            outputs = embedding_model(**inputs)
            
        # Mean pooling to get sentence representation
        attention_mask = inputs["attention_mask"]
        token_embeddings = outputs.last_hidden_state
        input_mask_expanded = attention_mask.unsqueeze(-1).expand(token_embeddings.size()).float()
        sentence_embedding = torch.sum(token_embeddings * input_mask_expanded, 1) / torch.clamp(input_mask_expanded.sum(1), min=1e-9)
        
        # Normalize embeddings
        sentence_embedding = torch.nn.functional.normalize(sentence_embedding, p=2, dim=1)
        
        # Convert to list for JSON serialization
        embedding = sentence_embedding[0].tolist()
        
        return {
            "embedding": embedding,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/analyze/sentiment")
async def analyze_sentiment(request: TextRequest) -> SentimentResponse:
    """Analyze sentiment using the multilingual 5-class sentiment model."""
    try:
        # Tokenize the input
        inputs = sentiment_tokenizer(request.text, truncation=True, padding=True, 
                                   return_tensors="pt", max_length=512)
        
        # Get predictions
        with torch.no_grad():
            outputs = sentiment_model(**inputs)
        
        # Get probabilities
        probabilities = torch.nn.functional.softmax(outputs.logits, dim=-1)[0]
        
        # Map the 5-class model results to our 3-class response
        # Class ordering: 0: Very Negative, 1: Negative, 2: Neutral, 3: Positive, 4: Very Positive
        very_negative = probabilities[0].item()
        negative = probabilities[1].item()
        neutral = probabilities[2].item()
        positive = probabilities[3].item()
        very_positive = probabilities[4].item()
        
        # Combine the classes into our 3-class format
        combined_negative = very_negative + negative
        combined_positive = positive + very_positive
        
        # Normalize to ensure sum is 1.0
        total = combined_negative + neutral + combined_positive
        
        return SentimentResponse(
            positive=combined_positive / total,
            negative=combined_negative / total,
            neutral=neutral / total
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/vectorize/song")
async def vectorize_song(request: AnalysisRequest) -> Dict[str, Any]:
    """Generate embeddings for song analyses using Transformers."""
    try:
        results = []
        
        for song_analysis in request.analyses:
            # Generate query from song analysis
            query = create_song_vector_query(song_analysis)
            
            # Tokenize and get model inputs
            inputs = embedding_tokenizer(query, padding=True, truncation=True, 
                                     return_tensors="pt", max_length=512)
            
            # Generate embeddings
            with torch.no_grad():
                outputs = embedding_model(**inputs)
                
            # Mean pooling to get sentence representation
            attention_mask = inputs["attention_mask"]
            token_embeddings = outputs.last_hidden_state
            input_mask_expanded = attention_mask.unsqueeze(-1).expand(token_embeddings.size()).float()
            sentence_embedding = torch.sum(token_embeddings * input_mask_expanded, 1) / torch.clamp(input_mask_expanded.sum(1), min=1e-9)
            
            # Normalize embeddings
            sentence_embedding = torch.nn.functional.normalize(sentence_embedding, p=2, dim=1)
            
            # Get track info if available
            track_info = song_analysis.get("track", {})
            
            result = {
                "embedding": sentence_embedding[0].tolist(),
                "track_info": track_info
            }
            
            results.append(result)
        
        return {"results": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/vectorize/playlist")
async def vectorize_playlist(request: Dict[str, Any]) -> Dict[str, Any]:
    """Generate embeddings for a playlist using Transformers."""
    try:
        playlist_data = request.get("playlist", request)
        
        # Generate query from playlist data
        query = create_playlist_vector_query(playlist_data)
        
        # Tokenize and get model inputs
        inputs = embedding_tokenizer(query, padding=True, truncation=True, 
                                 return_tensors="pt", max_length=512)
        
        # Generate embeddings
        with torch.no_grad():
            outputs = embedding_model(**inputs)
            
        # Mean pooling to get sentence representation
        attention_mask = inputs["attention_mask"]
        token_embeddings = outputs.last_hidden_state
        input_mask_expanded = attention_mask.unsqueeze(-1).expand(token_embeddings.size()).float()
        sentence_embedding = torch.sum(token_embeddings * input_mask_expanded, 1) / torch.clamp(input_mask_expanded.sum(1), min=1e-9)
        
        # Normalize embeddings
        sentence_embedding = torch.nn.functional.normalize(sentence_embedding, p=2, dim=1)
        
        # Return the embedding with playlist info
        return {
            "embedding": sentence_embedding[0].tolist(),
            "playlist_id": playlist_data.get("id", ""),
            "track_count": len(playlist_data.get("track_ids", []))
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/")
async def root():
    """Root endpoint that provides API information."""
    return {
        "service": "Music-Playlist Vectorization API",
        "version": "1.0.0",
        "endpoints": {
            "/vectorize/song": "Generate embeddings for songs",
            "/vectorize/playlist": "Generate embeddings for playlists",
            "/vectorize/text": "Generate embeddings for arbitrary text",
            "/analyze/sentiment": "Analyze text sentiment with 5-class model",
            "/": "This information"
        }
    }

if __name__ == "__main__":
    import uvicorn
    PORT = 8000
    print(f"🚀 Vectorization Server starting on http://localhost:{PORT}")
    uvicorn.run(app, host="0.0.0.0", port=PORT)