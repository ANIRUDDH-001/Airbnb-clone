from pydantic import BaseModel, Field


class LoginIn(BaseModel):
    email: str = Field(min_length=3, max_length=255)


class UserOut(BaseModel):
    id: int
    name: str
    email: str
    avatar_url: str | None
    is_superhost: bool
    is_host: bool  # owns at least one active listing


class PersonSummary(BaseModel):
    id: int
    name: str
    avatar_url: str | None
