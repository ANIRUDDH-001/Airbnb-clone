from app.routers import auth, catalog, health, listings

ROUTERS = [health.router, auth.router, catalog.router, listings.router]
