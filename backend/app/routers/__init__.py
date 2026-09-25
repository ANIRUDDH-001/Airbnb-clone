from app.routers import auth, health

ROUTERS = [health.router, auth.router]
