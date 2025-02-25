from fastapi import FastAPI, HTTPException # type: ignore
from pydantic import BaseModel
from sentence_transformers import SentenceTransformer # type: ignore
from typing import List, Dict

app = FastAPI()
model = SentenceTransformer("intfloat/multilingual-e5-large-instruct")

class Analysis(BaseModel):
    meaning: Dict
    emotional: Dict
    context: Dict

class AnalysisRequest(BaseModel):
    analyses: List[Analysis]

TASKS = {
    "meaning": "Analyze the song's emotional tone, themes, and context for playlist matching.",
    "emotional": "Describe the emotional progression of the song for playlist categorization.",
    "context": "Match the song to listening scenarios and contexts."
}

def create_query(task: str, analysis: Analysis) -> str:
    theme_description = analysis.meaning.get("interpretation", {}).get("main_message", "")
    mood_description = analysis.emotional.get("dominantMood", {}).get("description", "")
    context_description = analysis.context.get("primary_setting", "")

    return f"Instruct: {task}\nThemes: {theme_description}\nMood: {mood_description}\nContext: {context_description}"

@app.post("/encode")
async def encode(request: AnalysisRequest) -> Dict[str, List[Dict[str, List[float]]]]:
    try:
        embeddings = []
        
        for analysis in request.analyses:
            task_queries = {
                "meaning": create_query(TASKS["meaning"], analysis),
                "emotional": create_query(TASKS["emotional"], analysis),
                "context": create_query(TASKS["context"], analysis)
            }
            
            song_embeddings = {
                task: model.encode(query, normalize_embeddings=True).tolist()
                for task, query in task_queries.items()
            }

            embeddings.append(song_embeddings)

        return {"embeddings": embeddings}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn # type: ignore
    PORT = 8000
    print(f"🚀 Server starting on http://localhost:{PORT}")
    uvicorn.run(app, host="0.0.0.0", port=PORT)