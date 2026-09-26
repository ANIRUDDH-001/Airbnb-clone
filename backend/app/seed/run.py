"""Deterministic demo data (random.Random(42)); every date is relative to `today` so the demo never goes stale."""

import random
from datetime import date, datetime, time, timedelta

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.destinations import DESTINATIONS
from app.models import Amenity, Booking, Category, Listing, ListingPhoto, Review, User, WishlistItem
from app.seed.data import (
    ALWAYS_AMENITIES, AMENITIES, CATEGORIES, DEMO_GUEST_EMAIL, DEMO_HOST_LISTING_INDEXES, DESTINATION_THEMES,
    GUESTS, HOSTS, LISTINGS, OPTIONAL_AMENITIES, REVIEW_COMMENTS, THEME_AMENITIES, Blueprint,
)
from app.seed.photos import EXTERIOR, INTERIOR
from app.services.pricing import quote
from app.services.reviews import recompute_listing_rating

TYPE_LABELS = {"guest_house": "guest house", "tiny_home": "tiny home", "farm_stay": "farm stay"}


def seed_if_empty(db: Session, today: date) -> bool:
    if db.scalar(select(func.count(User.id))):
        return False
    seed(db, today)
    return True


def seed(db: Session, today: date) -> None:
    rng = random.Random(42)
    amenities = {code: Amenity(code=code, name=name, icon=icon, group_name=group) for code, name, icon, group in AMENITIES}
    categories = {slug: Category(slug=slug, name=name, icon=icon, position=i)
                  for i, (slug, name, icon) in enumerate(CATEGORIES)}
    hosts = [User(name=n, email=e, is_superhost=s, avatar_url=a, bio=b,
                  created_at=datetime.combine(today - timedelta(days=365 * years), time(9)))
             for n, e, s, a, b, years in HOSTS]
    guests = [User(name=n, email=e, avatar_url=a, created_at=datetime.combine(today - timedelta(days=700), time(9)))
              for n, e, a in GUESTS]
    db.add_all([*amenities.values(), *categories.values(), *hosts, *guests])

    # Covers are dealt from a shuffled deck per theme, so no two listings share one (the grid shows only covers).
    covers = {theme: rng.sample(pool, len(pool)) for theme, pool in EXTERIOR.items()}
    listings = [_make_listing(rng, i, bp, hosts, amenities, categories, covers, today) for i, bp in enumerate(LISTINGS)]
    db.add_all(listings)
    db.flush()

    demo_guest = next(g for g in guests if g.email == DEMO_GUEST_EMAIL)
    taken: dict[int, list[tuple[date, date]]] = {listing.id: [] for listing in listings}
    _demo_guest_trips(db, rng, demo_guest, listings, taken, today)
    other_guests = [g for g in guests if g is not demo_guest]
    for listing in listings:
        _history(db, rng, listing, other_guests, taken, today)
    db.flush()

    for listing in listings:
        recompute_listing_rating(db, listing.id)
    db.add_all(WishlistItem(user_id=demo_guest.id, listing_id=listings[i].id) for i in (3, 13, 36))
    db.commit()


def _make_listing(rng, index, bp: Blueprint, hosts, amenities, categories, covers, today) -> Listing:
    destination = next(d for d in DESTINATIONS if d.name == bp.destination)
    theme = DESTINATION_THEMES[bp.destination]
    host = hosts[0] if index in DEMO_HOST_LISTING_INDEXES else hosts[1 + index % (len(hosts) - 1)]
    codes = set(ALWAYS_AMENITIES) | set(THEME_AMENITIES[theme]) | set(rng.sample(OPTIONAL_AMENITIES, rng.randint(2, 5)))
    if "amazing_pools" in bp.categories:
        codes.add("pool")
    photos = [covers[theme].pop(), rng.choice(INTERIOR["living"]), *rng.sample(INTERIOR["bedroom"], 2),
              rng.choice(INTERIOR["bathroom"])]
    listing = Listing(
        host=host, title=bp.title, description=_describe(bp, destination.blurb),
        property_type=bp.property_type, room_type=bp.room_type, max_guests=bp.max_guests, bedrooms=bp.bedrooms,
        beds=bp.beds, bathrooms=bp.bathrooms, nightly_price=bp.nightly_price, cleaning_fee=bp.cleaning_fee,
        address=f"{rng.randint(1, 240)} {rng.choice(['Main Road', 'Temple Street', 'Hill View Lane', 'Lake Road', 'Market Street'])}",
        city=bp.city, state=destination.state, country=destination.country,
        latitude=round(destination.latitude + rng.uniform(-0.06, 0.06), 5),
        longitude=round(destination.longitude + rng.uniform(-0.06, 0.06), 5),
        created_at=datetime.combine(today - timedelta(days=rng.randint(120, 900)), time(10)),
    )
    listing.amenities = [amenities[c] for c in sorted(codes)]
    listing.categories = [categories[s] for s in bp.categories]
    listing.photos = [ListingPhoto(url=url, position=i) for i, url in enumerate(photos)]
    return listing


def _describe(bp: Blueprint, blurb: str) -> str:
    kind = TYPE_LABELS.get(bp.property_type, bp.property_type)
    rooms = f"{bp.bedrooms} bedroom{'s' * (bp.bedrooms != 1)}, {bp.beds} bed{'s' * (bp.beds != 1)} and {bp.bathrooms} bathroom{'s' * (bp.bathrooms != 1)}"
    return (
        f"{bp.title} — a {kind} in {bp.city} for up to {bp.max_guests} guests. {blurb} are close by.\n\n"
        f"The space\nYou'll have {rooms}, fresh linen, fast wifi and a calm corner for your morning coffee.\n\n"
        f"Guest access\n{'The whole place is yours' if bp.room_type == 'entire_home' else 'Your private room plus shared common areas'}.\n\n"
        f"Other things to note\nCheck-in after 2 pm, check-out by 11 am. No parties or events."
    )


def _free(taken: list[tuple[date, date]], check_in: date, check_out: date) -> bool:
    return all(check_out <= a or b <= check_in for a, b in taken)


def _book(db, rng, listing, guest, check_in, check_out, taken, status="confirmed") -> Booking:
    adults = rng.randint(1, min(4, listing.max_guests))
    children = rng.randint(0, listing.max_guests - adults) if rng.random() < 0.3 else 0
    price = quote(listing.nightly_price, listing.cleaning_fee, check_in, check_out)
    booking = Booking(
        listing_id=listing.id, guest_id=guest.id, check_in=check_in, check_out=check_out, adults=adults,
        children=children, infants=0, status=status, nightly_price=price.nightly_price, nights=price.nights,
        cleaning_fee=price.cleaning_fee, service_fee=price.service_fee, taxes=price.taxes, total=price.total,
        created_at=datetime.combine(check_in - timedelta(days=rng.randint(10, 60)), time(12)),
    )
    db.add(booking)
    if status == "confirmed":
        taken[listing.id].append((check_in, check_out))
    return booking


def _review(db, rng, booking, listing) -> None:
    overall = rng.choice([5, 5, 5, 5, 5, 4, 4, 4, 3])
    sub = lambda: max(1, min(5, overall + rng.choice([-1, 0, 0, 0, 1])))  # noqa: E731
    db.add(Review(
        booking=booking, rating=overall, cleanliness_rating=sub(), accuracy_rating=sub(), check_in_rating=sub(),
        communication_rating=sub(), location_rating=sub(), value_rating=sub(),
        comment=rng.choice(REVIEW_COMMENTS).format(host=listing.host.name.split()[0], city=listing.city),
        created_at=datetime.combine(booking.check_out + timedelta(days=2), time(10)),
    ))


def _demo_guest_trips(db, rng, guest, listings, taken, today) -> None:
    d = lambda n: today + timedelta(days=n)  # noqa: E731
    _book(db, rng, listings[1], guest, d(10), d(14), taken)                       # upcoming: Palolem beach hut
    _book(db, rng, listings[5], guest, d(40), d(44), taken)                       # upcoming: Vashisht cottage
    reviewed = _book(db, rng, listings[2], guest, d(-60), d(-56), taken)          # past, reviewed
    _review(db, rng, reviewed, listings[2])
    _book(db, rng, listings[9], guest, d(-12), d(-9), taken)                      # past, awaiting review
    _book(db, rng, listings[6], guest, d(20), d(23), taken, status="cancelled")   # cancelled


def _history(db, rng, listing, guests, taken, today) -> None:
    cursor = today - timedelta(days=330)
    for _ in range(rng.randint(3, 5)):  # completed stays
        check_in = cursor + timedelta(days=rng.randint(5, 40))
        check_out = check_in + timedelta(days=rng.randint(2, 5))
        if check_out >= today:
            break
        cursor = check_out
        if _free(taken[listing.id], check_in, check_out):
            booking = _book(db, rng, listing, rng.choice(guests), check_in, check_out, taken)
            if rng.random() < 0.85:
                _review(db, rng, booking, listing)
    cursor = today + timedelta(days=rng.randint(1, 7))
    for _ in range(rng.randint(1, 3)):  # upcoming stays
        check_in, check_out = cursor, cursor + timedelta(days=rng.randint(2, 5))
        if _free(taken[listing.id], check_in, check_out):
            _book(db, rng, listing, rng.choice(guests), check_in, check_out, taken)
        cursor = check_out + timedelta(days=rng.randint(3, 20))
