from pydantic import BaseModel, Field


class AskRequest(BaseModel):
    question: str = Field(min_length=2, max_length=2000)
    conversation_id: str | None = None


class Source(BaseModel):
    title: str
    page: int | None = None
    similarity: float


class AskResponse(BaseModel):
    answer: str
    sources: list[Source]
    confidence: float
    grounded: bool
