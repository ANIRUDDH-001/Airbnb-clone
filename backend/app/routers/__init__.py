from app.routers import auth, bookings, catalog, health, listings

ROUTERS = [health.router, auth.router, catalog.router, listings.router, bookings.router]
