from fastapi import FastAPI, HTTPException
from .graph import rag_graph
from .models import AskRequest, AskResponse, Source

app = FastAPI(title="KiliGuide RAG Service", version="1.0.0")


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/v1/ask", response_model=AskResponse)
async def ask(request: AskRequest):
    try:
        state = await rag_graph.ainvoke({"question": request.question})
        chunks = state.get("chunks", [])
        return AskResponse(
            answer=state["answer"],
            sources=[Source(title=c["title"], page=c["page"], similarity=c["similarity"]) for c in chunks],
            confidence=state.get("confidence", 0),
            grounded=state.get("grounded", False),
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Unable to process the question.") from exc
