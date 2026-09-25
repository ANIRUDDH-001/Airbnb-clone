from datetime import datetime

from pydantic import BaseModel


class ReviewOut(BaseModel):
    id: int
    author_name: str
    author_avatar_url: str | None
    rating: int
    comment: str
    created_at: datetime
