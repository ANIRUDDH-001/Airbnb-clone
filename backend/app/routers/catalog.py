from dataclasses import asdict

from fastapi import APIRouter
from sqlalchemy import select

from app.core.db import DbSession
from app.destinations import DESTINATIONS
from app.models import Amenity, Category
from app.schemas.listing import AmenityOut, CategoryOut, DestinationOut

router = APIRouter(tags=["catalog"])


@router.get("/categories", response_model=list[CategoryOut])
def list_categories(db: DbSession):
    return db.scalars(select(Category).order_by(Category.position, Category.id)).all()


@router.get("/amenities", response_model=list[AmenityOut])
def list_amenities(db: DbSession):
    return db.scalars(select(Amenity).order_by(Amenity.group_name, Amenity.name)).all()


@router.get("/destinations", response_model=list[DestinationOut])
def list_destinations() -> list[DestinationOut]:
    return [DestinationOut(**asdict(destination)) for destination in DESTINATIONS]
