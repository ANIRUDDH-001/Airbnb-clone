from sqlalchemy import delete, select
from sqlalchemy.orm import Session, selectinload

from app.models import Listing, User, WishlistItem
from app.schemas.listing import ListingCard
from app.services.listings import cards_for, get_active_listing


def save(db: Session, user: User, listing_id: int) -> None:
    get_active_listing(db, listing_id)
    if db.get(WishlistItem, (user.id, listing_id)) is None:
        db.add(WishlistItem(user_id=user.id, listing_id=listing_id))
        db.commit()


def unsave(db: Session, user: User, listing_id: int) -> None:
    db.execute(delete(WishlistItem).where(WishlistItem.user_id == user.id, WishlistItem.listing_id == listing_id))
    db.commit()


def list_saved(db: Session, user: User) -> list[ListingCard]:
    rows = db.scalars(
        select(Listing)
        .join(WishlistItem, WishlistItem.listing_id == Listing.id)
        .where(WishlistItem.user_id == user.id, Listing.deleted_at.is_(None))
        .order_by(WishlistItem.created_at.desc(), Listing.id.desc())
        .options(selectinload(Listing.photos))
    ).all()
    return cards_for(db, rows, user)
