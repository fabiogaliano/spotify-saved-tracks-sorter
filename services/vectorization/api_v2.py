"""
Music-Playlist Vectorization API v2

A generic text→vector service with NO knowledge of music schemas.
TypeScript handles domain-specific extraction, Python just embeds text.
"""

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Dict, List, Optional
import torch
import torch.nn.functional as F
from transformers import AutoTokenizer, AutoModel, AutoModelForSequenceClassification
from fastapi.middleware.cors import CORSMiddleware
import numpy as np
from enum import Enum

app = FastAPI(title="Text Vectorization API v2")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ModelType(str, Enum):
    GENERAL = "general"
    CREATIVE = "creative"
    SEMANTIC = "semantic"
    FAST = "fast"


# Load models
print("Loading models...")
models = {
    ModelType.GENERAL: {
        "tokenizer": AutoTokenizer.from_pretrained("sentence-transformers/all-MiniLM-L6-v2"),
        "model": AutoModel.from_pretrained("sentence-transformers/all-MiniLM-L6-v2")
    },
    ModelType.CREATIVE: {
        "tokenizer": AutoTokenizer.from_pretrained("sentence-transformers/all-mpnet-base-v2"),
        "model": AutoModel.from_pretrained("sentence-transformers/all-mpnet-base-v2")
    },
    ModelType.SEMANTIC: {
        "tokenizer": AutoTokenizer.from_pretrained("sentence-transformers/multi-qa-mpnet-base-dot-v1"),
        "model": AutoModel.from_pretrained("sentence-transformers/multi-qa-mpnet-base-dot-v1")
    },
    ModelType.FAST: {
        "tokenizer": AutoTokenizer.from_pretrained("sentence-transformers/paraphrase-MiniLM-L3-v2"),
        "model": AutoModel.from_pretrained("sentence-transformers/paraphrase-MiniLM-L3-v2")
    }
}

sentiment_tokenizer = AutoTokenizer.from_pretrained("cardiffnlp/twitter-roberta-base-sentiment-latest")
sentiment_model = AutoModelForSequenceClassification.from_pretrained("cardiffnlp/twitter-roberta-base-sentiment-latest")
print("Models loaded successfully!")


# =============================================================================
# Request/Response Models
# =============================================================================

class EmbedRequest(BaseModel):
    text: str
    model_type: ModelType = ModelType.GENERAL


class EmbedBatchRequest(BaseModel):
    texts: List[str]
    model_type: ModelType = ModelType.GENERAL


class HybridEmbedRequest(BaseModel):
    """
    Hybrid embedding request with categorized text.
    TypeScript extracts these from domain objects (songs, playlists).
    """
    texts: Dict[str, str]  # {"metadata": "...", "analysis": "...", "context": "..."}
    weights: Optional[Dict[str, float]] = None  # Optional custom weights


class SentimentRequest(BaseModel):
    text: str


class SentimentResponse(BaseModel):
    positive: float
    negative: float
    neutral: float


class SimilarityRequest(BaseModel):
    vec1: List[float]
    vec2: List[float]


# =============================================================================
# Core Embedding Functions
# =============================================================================

def mean_pooling(model_output, attention_mask):
    """Mean pooling for sentence embeddings"""
    token_embeddings = model_output[0]
    input_mask_expanded = attention_mask.unsqueeze(-1).expand(token_embeddings.size()).float()
    return torch.sum(token_embeddings * input_mask_expanded, 1) / torch.clamp(input_mask_expanded.sum(1), min=1e-9)


def get_embedding(text: str, model_type: ModelType = ModelType.GENERAL) -> List[float]:
    """Generate embedding for a single text"""
    if not text or not text.strip():
        # Return zero vector for empty text
        dim = 384 if model_type in [ModelType.GENERAL, ModelType.FAST] else 768
        return [0.0] * dim

    model_info = models[model_type]
    tokenizer = model_info["tokenizer"]
    model = model_info["model"]

    inputs = tokenizer(text, padding=True, truncation=True,
                       return_tensors="pt", max_length=512)

    with torch.no_grad():
        outputs = model(**inputs)

    embeddings = mean_pooling(outputs, inputs["attention_mask"])
    embeddings = F.normalize(embeddings, p=2, dim=1)

    return embeddings[0].tolist()


def get_embeddings_batch(texts: List[str], model_type: ModelType = ModelType.GENERAL) -> List[List[float]]:
    """Generate embeddings for multiple texts efficiently"""
    if not texts:
        return []

    model_info = models[model_type]
    tokenizer = model_info["tokenizer"]
    model = model_info["model"]

    # Filter empty texts but track their positions
    non_empty_indices = [i for i, t in enumerate(texts) if t and t.strip()]
    non_empty_texts = [texts[i] for i in non_empty_indices]

    if not non_empty_texts:
        dim = 384 if model_type in [ModelType.GENERAL, ModelType.FAST] else 768
        return [[0.0] * dim for _ in texts]

    # Process in batches
    batch_size = 8
    all_embeddings = []

    for i in range(0, len(non_empty_texts), batch_size):
        batch = non_empty_texts[i:i + batch_size]

        inputs = tokenizer(batch, padding=True, truncation=True,
                           return_tensors="pt", max_length=512)

        with torch.no_grad():
            outputs = model(**inputs)

        embeddings = mean_pooling(outputs, inputs["attention_mask"])
        embeddings = F.normalize(embeddings, p=2, dim=1)
        all_embeddings.extend(embeddings.tolist())

    # Reconstruct full list with zero vectors for empty texts
    dim = len(all_embeddings[0]) if all_embeddings else 384
    result = [[0.0] * dim for _ in texts]
    for idx, emb_idx in enumerate(non_empty_indices):
        result[emb_idx] = all_embeddings[idx]

    return result


# =============================================================================
# API Endpoints
# =============================================================================

@app.post("/embed")
async def embed(request: EmbedRequest) -> Dict:
    """
    Generate embedding for a single text.

    This is the core endpoint - TypeScript extracts text from domain objects
    and sends it here for embedding.
    """
    try:
        embedding = get_embedding(request.text, request.model_type)
        return {
            "embedding": embedding,
            "model": request.model_type,
            "dimensions": len(embedding)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/embed/batch")
async def embed_batch(request: EmbedBatchRequest) -> Dict:
    """
    Batch embed multiple texts efficiently.
    """
    try:
        embeddings = get_embeddings_batch(request.texts, request.model_type)
        return {
            "embeddings": embeddings,
            "count": len(embeddings),
            "model": request.model_type
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/embed/hybrid")
async def embed_hybrid(request: HybridEmbedRequest) -> Dict:
    """
    Generate hybrid embedding from categorized text with weights.

    TypeScript sends pre-extracted text categories:
    - metadata: title, artist, genre
    - analysis: themes, mood, meaning
    - context: listening contexts, situations

    Each category is embedded separately and combined with weights.
    """
    try:
        # Default weights if not provided
        weights = request.weights or {
            "metadata": 0.3,
            "analysis": 0.5,
            "context": 0.2
        }

        # Normalize weights (fall back to defaults if sum is 0)
        total_weight = sum(weights.values())
        if total_weight > 0:
            weights = {k: v / total_weight for k, v in weights.items()}
        else:
            weights = {"metadata": 0.3, "analysis": 0.5, "context": 0.2}

        # Choose model based on content
        # Use creative model for richer semantic content
        model_type = ModelType.CREATIVE

        # Generate embeddings for each category
        embeddings = {}
        combined = None

        for key, text in request.texts.items():
            if text and text.strip():
                emb = get_embedding(text, model_type)
                embeddings[key] = emb

                weight = weights.get(key, 0.33)
                if combined is None:
                    combined = np.array(emb) * weight
                else:
                    # Handle dimension mismatch by padding/truncating
                    emb_array = np.array(emb)
                    if len(emb_array) != len(combined):
                        # Use the longer dimension
                        if len(emb_array) > len(combined):
                            combined = np.pad(combined, (0, len(emb_array) - len(combined)))
                        else:
                            emb_array = np.pad(emb_array, (0, len(combined) - len(emb_array)))
                    combined += emb_array * weight

        if combined is None:
            # No valid text, return zero vector
            combined = np.zeros(768)

        # Normalize the combined embedding
        norm = np.linalg.norm(combined)
        if norm > 0:
            combined = combined / norm

        return {
            "embedding": combined.tolist(),
            "components": list(embeddings.keys()),
            "weights": weights,
            "dimensions": len(combined)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/sentiment")
async def analyze_sentiment(request: SentimentRequest) -> SentimentResponse:
    """Analyze sentiment of text"""
    try:
        text = request.text[:512] if request.text else ""

        if not text.strip():
            return SentimentResponse(negative=0.33, neutral=0.34, positive=0.33)

        inputs = sentiment_tokenizer(text, truncation=True, padding=True,
                                     return_tensors="pt", max_length=512)

        with torch.no_grad():
            outputs = sentiment_model(**inputs)

        probabilities = torch.nn.functional.softmax(outputs.logits, dim=-1)[0]

        # Model outputs: [negative, neutral, positive]
        return SentimentResponse(
            negative=probabilities[0].item(),
            neutral=probabilities[1].item(),
            positive=probabilities[2].item()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/similarity/calculate")
async def calculate_similarity(request: SimilarityRequest) -> Dict[str, float]:
    """Calculate similarity metrics between two vectors"""
    try:
        v1 = np.array(request.vec1)
        v2 = np.array(request.vec2)

        # Reject dimension mismatch - indicates bug or misconfiguration
        if len(v1) != len(v2):
            raise HTTPException(
                status_code=400,
                detail=f"Vector dimension mismatch: vec1 has {len(v1)} dimensions, vec2 has {len(v2)} dimensions"
            )

        # Cosine similarity
        norm1, norm2 = np.linalg.norm(v1), np.linalg.norm(v2)
        if norm1 == 0 or norm2 == 0:
            cosine_sim = 0.0
        else:
            cosine_sim = float(np.dot(v1, v2) / (norm1 * norm2))

        # Euclidean distance → similarity
        euclidean_dist = float(np.linalg.norm(v1 - v2))
        euclidean_sim = 1 / (1 + euclidean_dist)

        # Manhattan distance → similarity
        manhattan_dist = float(np.sum(np.abs(v1 - v2)))
        manhattan_sim = 1 / (1 + manhattan_dist)

        return {
            "cosine": cosine_sim,
            "euclidean": euclidean_sim,
            "manhattan": manhattan_sim,
            "average": (cosine_sim + euclidean_sim + manhattan_sim) / 3
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/")
async def root():
    """API information"""
    return {
        "service": "Text Vectorization API v2",
        "version": "2.0.0",
        "description": "Generic text→vector service. No domain knowledge.",
        "models": {
            "general": "all-MiniLM-L6-v2 (384d)",
            "creative": "all-mpnet-base-v2 (768d)",
            "semantic": "multi-qa-mpnet-base-dot-v1 (768d)",
            "fast": "paraphrase-MiniLM-L3-v2 (384d)"
        },
        "endpoints": {
            "/embed": "Single text embedding",
            "/embed/batch": "Batch text embedding",
            "/embed/hybrid": "Weighted multi-category embedding",
            "/sentiment": "Sentiment analysis",
            "/similarity/calculate": "Vector similarity metrics"
        }
    }


@app.get("/health")
async def health():
    """Health check endpoint"""
    return {"status": "healthy", "models_loaded": True}


if __name__ == "__main__":
    import uvicorn
    import sys
    PORT = 8000
    print(f"🚀 Text Vectorization API v2 starting on http://localhost:{PORT}", flush=True)
    sys.stdout.flush()
    uvicorn.run(app, host="0.0.0.0", port=PORT, log_level="info")
