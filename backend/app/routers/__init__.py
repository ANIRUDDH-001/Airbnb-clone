from app.routers import auth, bookings, catalog, health, host, listings, wishlist

ROUTERS = [health.router, auth.router, catalog.router, listings.router, bookings.router, wishlist.router, host.router]
