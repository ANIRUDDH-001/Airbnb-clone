from fastapi import APIRouter, Request, Response

from app.core.auth import SESSION_USER_KEY, CurrentUser
from app.core.db import DbSession
from app.schemas.user import LoginIn, UserOut
from app.services import users as users_service

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=UserOut)
def login(body: LoginIn, request: Request, db: DbSession) -> UserOut:
    user = users_service.find_by_email(db, body.email)
    request.session[SESSION_USER_KEY] = user.id
    return users_service.to_user_out(db, user)


@router.post("/logout", status_code=204)
def logout(request: Request) -> Response:
    request.session.clear()
    return Response(status_code=204)


@router.get("/me", response_model=UserOut)
def me(user: CurrentUser, db: DbSession) -> UserOut:
    return users_service.to_user_out(db, user)
