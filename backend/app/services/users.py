from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.errors import AppError
from app.models import Listing, User
from app.schemas.user import UserOut


def find_by_email(db: Session, email: str) -> User:
    user = db.scalar(select(User).where(User.email == email.strip().lower()))
    if user is None:
        raise AppError(404, "unknown_account", "No demo account uses that email")
    return user


def to_user_out(db: Session, user: User) -> UserOut:
    owns_listing = db.scalar(
        select(Listing.id).where(Listing.host_id == user.id, Listing.deleted_at.is_(None)).limit(1)
    ) is not None
    return UserOut(id=user.id, name=user.name, email=user.email, avatar_url=user.avatar_url,
                   is_superhost=user.is_superhost, is_host=owns_listing)
