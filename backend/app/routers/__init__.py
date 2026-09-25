from app.routers import auth, bookings, catalog, health, listings, wishlist

ROUTERS = [health.router, auth.router, catalog.router, listings.router, bookings.router, wishlist.router]
