"""Safety-first LangGraph workflow for KiliGuide RAG.

The graph is intentionally deterministic. LangGraph provides state, branching and
observability; it does not give the model authority to choose external tools.
"""
from __future__ import annotations

from typing import Annotated, TypedDict
import asyncpg
from langchain_google_genai import ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings
from langchain_core.messages import HumanMessage, SystemMessage
from langgraph.graph import END, START, StateGraph

from .config import settings

UNAVAILABLE = "Sorry, I could not find this information in the university knowledge base."


class Chunk(TypedDict):
    title: str
    page: int | None
    content: str
    similarity: float


class RAGState(TypedDict, total=False):
    question: str
    chunks: list[Chunk]
    answer: str
    confidence: float
    grounded: bool


embeddings = GoogleGenerativeAIEmbeddings(
    model="models/gemini-embedding-001",
    google_api_key=settings.gemini_api_key,
    output_dimensionality=768,
)
model = ChatGoogleGenerativeAI(
    model="gemini-2.5-flash",
    google_api_key=settings.gemini_api_key,
    temperature=0,
)


async def retrieve(state: RAGState) -> RAGState:
    """Embed the query and retrieve only active university document chunks."""
    vector = await embeddings.aembed_query(state["question"])
    pool = await asyncpg.create_pool(settings.database_url, min_size=1, max_size=3)
    try:
        rows = await pool.fetch(
            "select title, page_number, content, similarity "
            "from public.match_document_chunks($1::vector, 6)",
            str(vector),
        )
    finally:
        await pool.close()
    chunks: list[Chunk] = [
        {"title": row["title"], "page": row["page_number"], "content": row["content"], "similarity": float(row["similarity"])}
        for row in rows
    ]
    return {"chunks": chunks, "confidence": chunks[0]["similarity"] if chunks else 0.0}


def evidence_route(state: RAGState) -> str:
    """This deterministic gate prevents generation without adequate evidence."""
    if not state.get("chunks") or state.get("confidence", 0) < settings.rag_match_threshold:
        return "refuse"
    return "answer"


async def refuse(_: RAGState) -> RAGState:
    return {"answer": UNAVAILABLE, "grounded": False}


async def answer(state: RAGState) -> RAGState:
    context = "\n\n".join(f"[{i + 1}] {chunk['content']}" for i, chunk in enumerate(state["chunks"]))
    system = (
        "You are KiliGuide, a university information assistant. Answer strictly from CONTEXT. "
        "Do not use outside knowledge or guess. Cite every factual statement with [n]. "
        f"If context is insufficient, respond exactly: {UNAVAILABLE}\n\nCONTEXT:\n{context}"
    )
    response = await model.ainvoke([SystemMessage(content=system), HumanMessage(content=state["question"])])
    text = response.content if isinstance(response.content, str) else UNAVAILABLE
    return {"answer": text.strip() or UNAVAILABLE, "grounded": text.strip() != UNAVAILABLE}


def build_rag_graph():
    graph = StateGraph(RAGState)
    graph.add_node("retrieve", retrieve)
    graph.add_node("refuse", refuse)
    graph.add_node("answer", answer)
    graph.add_edge(START, "retrieve")
    graph.add_conditional_edges("retrieve", evidence_route, {"refuse": "refuse", "answer": "answer"})
    graph.add_edge("refuse", END)
    graph.add_edge("answer", END)
    return graph.compile()


rag_graph = build_rag_graph()
