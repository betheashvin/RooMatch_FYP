"""Scrypt password/OTP hashing and revocable, opaque cookie sessions."""

from datetime import datetime, timedelta, timezone
import hashlib
import hmac
import os
import secrets

from fastapi import Depends, HTTPException, Request, Response
from sqlmodel import Session

from ..database import get_session
from ..models.accounts import AuthSession, User, utcnow

# Cookies are shared across ports on the same hostname. Keep this app's login
# separate from roomatch_ref when both development servers are running.
COOKIE_NAME = "roomatch_fyp_session"
SESSION_SECONDS = 7 * 24 * 60 * 60


def aware(value: datetime) -> datetime:
    # SQLite test databases discard timezone information.
    return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value


def hash_secret(secret: str) -> str:
    salt = secrets.token_hex(16)
    digest = hashlib.scrypt(secret.encode(), salt=bytes.fromhex(salt), n=16384, r=8, p=1).hex()
    return f"scrypt${salt}${digest}"


def verify_secret(secret: str, encoded: str) -> bool:
    try:
        algorithm, salt, expected = encoded.split("$")
        if algorithm != "scrypt":
            return False
        actual = hashlib.scrypt(secret.encode(), salt=bytes.fromhex(salt), n=16384, r=8, p=1).hex()
        return hmac.compare_digest(actual, expected)
    except (ValueError, TypeError):
        return False


def token_hash(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def secure_cookies() -> bool:
    return os.getenv("AUTH_COOKIE_SECURE", "false").lower() == "true"


def start_session(session: Session, user: User, response: Response) -> None:
    token = secrets.token_urlsafe(32)
    session.add(AuthSession(token_hash=token_hash(token), user_id=user.user_id,
                            expires_at=utcnow() + timedelta(seconds=SESSION_SECONDS)))
    session.commit()
    response.set_cookie(COOKIE_NAME, token, max_age=SESSION_SECONDS, httponly=True,
                        secure=secure_cookies(), samesite="lax", path="/api")
    response.headers["Cache-Control"] = "no-store"


def check_origin(request: Request) -> None:
    """Reject cross-site state changes even when cookies are sent by a client."""
    origin = request.headers.get("origin")
    allowed = {x.strip() for x in os.getenv(
        "FRONTEND_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"
    ).split(",")}
    if origin and origin not in allowed:
        raise HTTPException(403, "Request origin is not allowed.")


def current_user(request: Request, session: Session = Depends(get_session)) -> User:
    token = request.cookies.get(COOKIE_NAME)
    record = session.get(AuthSession, token_hash(token)) if token else None
    if record is None or aware(record.expires_at) <= utcnow():
        raise HTTPException(401, "Please sign in to continue.")
    user = session.get(User, record.user_id)
    if user is None or not user.is_verified:
        raise HTTPException(403, "Verify your email before continuing.")
    return user
