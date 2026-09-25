from typing import Annotated

from fastapi import APIRouter, Query

from app.core.auth import OptionalUser
from app.core.clock import Today
from app.core.db import DbSession
from app.schemas.common import Page
from app.schemas.listing import ListingCard, ListingSearchParams
from app.services import listings as listings_service

router = APIRouter(prefix="/listings", tags=["listings"])


@router.get("", response_model=Page[ListingCard])
def search_listings(params: Annotated[ListingSearchParams, Query()], db: DbSession, viewer: OptionalUser, today: Today):
    return listings_service.search_listings(db, params, today, viewer)
