from fastapi import APIRouter, Response

from app.core.auth import CurrentUser
from app.core.db import DbSession
from app.schemas.listing import ListingCard
from app.services import wishlist as wishlist_service

router = APIRouter(prefix="/wishlist", tags=["wishlist"])


@router.get("", response_model=list[ListingCard])
def list_saved(user: CurrentUser, db: DbSession):
    return wishlist_service.list_saved(db, user)


@router.put("/{listing_id}", status_code=204)
def save(listing_id: int, user: CurrentUser, db: DbSession) -> Response:
    wishlist_service.save(db, user, listing_id)
    return Response(status_code=204)


@router.delete("/{listing_id}", status_code=204)
def unsave(listing_id: int, user: CurrentUser, db: DbSession) -> Response:
    wishlist_service.unsave(db, user, listing_id)
    return Response(status_code=204)
