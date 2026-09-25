from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, Field


class ReviewOut(BaseModel):
    id: int
    author_name: str
    author_avatar_url: str | None
    rating: int
    comment: str
    created_at: datetime


Stars = Annotated[int, Field(ge=1, le=5)]


class ReviewCreate(BaseModel):
    rating: Stars
    cleanliness: Stars
    accuracy: Stars
    check_in: Stars
    communication: Stars
    location: Stars
    value: Stars
    comment: str = Field(min_length=10, max_length=2000)
