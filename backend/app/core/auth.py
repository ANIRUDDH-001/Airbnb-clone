"""Mock authentication: the signed session cookie (Starlette SessionMiddleware) stores the user's id."""

from typing import Annotated

from fastapi import Depends, Request

from app.core.db import DbSession
from app.core.errors import AppError
from app.models import User

SESSION_USER_KEY = "user_id"


def optional_user(request: Request, db: DbSession) -> User | None:
    user_id = request.session.get(SESSION_USER_KEY)
    if user_id is None:
        return None
    user = db.get(User, user_id)
    if user is None:  # user vanished (e.g. database reseeded): drop the stale session
        request.session.clear()
    return user


def current_user(user: Annotated[User | None, Depends(optional_user)]) -> User:
    if user is None:
        raise AppError(401, "not_authenticated", "Log in to continue")
    return user


OptionalUser = Annotated[User | None, Depends(optional_user)]
CurrentUser = Annotated[User, Depends(current_user)]
