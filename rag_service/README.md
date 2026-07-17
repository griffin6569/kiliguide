# KiliGuide LangGraph RAG service

This optional Python service replaces the `chat` Edge Function when you want LangGraph orchestration.

## Graph

```text
START → retrieve → evidence gate ── low confidence → refuse → END
                                  └─ adequate context → answer → END
```

It retrieves directly from KiliGuide's existing `match_document_chunks` pgvector SQL function. The evidence gate is deterministic, not an LLM decision, so answers cannot be generated when retrieval is weak.

## Run

1. Copy `.env.example` to `.env` and add a **Session Pooler** PostgreSQL URL plus `GEMINI_API_KEY`.
2. `python -m venv .venv`
3. Activate it, then run `pip install -r requirements.txt`.
4. Start: `uvicorn app.main:app --reload --port 8000`
5. Send `POST /v1/ask` with `{ "question": "When is the fee payment deadline?" }`.

Keep document ingestion and notice summaries in Supabase Edge Functions, or move those workloads to Python later. This service is designed to run on Cloud Run, Railway, Render, or another Python-capable host—not Supabase Edge Functions, which use Deno.
