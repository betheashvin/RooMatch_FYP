"""Registration, email verification, login, session lookup and logout."""

from datetime import timedelta
from math import ceil
import secrets

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy import delete
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, select

from ..database import get_session
from ..models.account_api import Credentials, EmailRequest, Message, ResetPasswordRequest, UserRead, VerifyRequest
from ..models.accounts import AuthSession, PasswordReset, User, utcnow
from ..services import email as email_service
from ..services.auth import (COOKIE_NAME, aware, check_origin, current_user, hash_secret,
                             secure_cookies, start_session, token_hash, verify_secret)

router = APIRouter(prefix="/auth", tags=["accounts"], dependencies=[Depends(check_origin)])


def find_user(session: Session, email: str) -> User | None:
    return session.exec(select(User).where(User.email == email).with_for_update()).first()


def issue_otp(session: Session, user: User) -> None:
    now = utcnow()
    if user.otp_sent_at and aware(user.otp_sent_at) + timedelta(seconds=60) > now:
        raise HTTPException(429, "Wait 60 seconds before requesting another code.")
    otp = f"{secrets.randbelow(1_000_000):06d}"
    user.otp_hash = hash_secret(otp)
    user.otp_expires_at = now + timedelta(minutes=10)
    user.otp_sent_at = now
    user.otp_attempts = 0
    session.add(user)
    session.flush()
    try:
        email_service.send_verification_email(user.email, otp)
    except (OSError, RuntimeError, ValueError):
        session.rollback()
        raise HTTPException(503, "Verification email could not be sent. Please try again later.") from None
    session.commit()


@router.post("/register", response_model=Message, status_code=201)
def register(body: Credentials, session: Session = Depends(get_session)):
    if find_user(session, body.email):
        raise HTTPException(409, "An account already exists. Sign in to continue or complete email verification.")
    user = User(email=body.email, password_hash=hash_secret(body.password))
    session.add(user)
    try:
        issue_otp(session, user)
    except IntegrityError:
        session.rollback()
        raise HTTPException(409, "An account already exists for this email.") from None
    return Message(detail="Verification code sent. Check your email.")


@router.post("/resend-otp", response_model=Message)
def resend(body: EmailRequest, session: Session = Depends(get_session)):
    user = find_user(session, body.email)
    if user and not user.is_verified:
        issue_otp(session, user)
    return Message(detail="If this email has an unverified account, a verification code has been sent.")


@router.post("/verify-email", response_model=UserRead)
def verify_email(body: VerifyRequest, response: Response, session: Session = Depends(get_session)):
    user = find_user(session, body.email)
    if user is None or user.is_verified or not user.otp_hash or not user.otp_expires_at:
        raise HTTPException(400, "Invalid or expired code. Request a new code.")
    if aware(user.otp_expires_at) <= utcnow():
        raise HTTPException(400, "This code has expired. Request a new code.")
    if user.otp_attempts >= 5:
        raise HTTPException(429, "Too many incorrect codes. Request a new code.")
    if not verify_secret(body.otp, user.otp_hash):
        user.otp_attempts += 1
        session.add(user)
        session.commit()
        raise HTTPException(400, "Incorrect verification code.")
    user.is_verified = True
    user.otp_hash = None
    user.otp_expires_at = None
    session.add(user)
    start_session(session, user, response)
    return user


@router.post("/login", response_model=UserRead)
def login(body: Credentials, response: Response, session: Session = Depends(get_session)):
    user = find_user(session, body.email)
    now = utcnow()
    if user and user.login_locked_until and aware(user.login_locked_until) > now:
        raise HTTPException(429, "Too many sign-in attempts. Try again in 15 minutes.")
    if user and user.login_locked_until:
        user.login_attempts = 0
        user.login_locked_until = None
    if user is None or not verify_secret(body.password, user.password_hash):
        if user:
            user.login_attempts += 1
            if user.login_attempts >= 5:
                user.login_locked_until = now + timedelta(minutes=15)
            session.add(user)
            session.commit()
        else:
            # Keep unknown-account requests subject to the same hashing cost.
            hash_secret(body.password)
        raise HTTPException(401, "Incorrect email or password.")
    if not user.is_verified:
        sent = False
        remaining = max(0, ceil((aware(user.otp_sent_at) + timedelta(seconds=60) - now).total_seconds())) if user.otp_sent_at else 0
        active = bool(user.otp_hash and user.otp_expires_at and aware(user.otp_expires_at) > now and user.otp_attempts < 5)
        if not active and remaining == 0:
            issue_otp(session, user)
            sent = True
            remaining = 60
        raise HTTPException(403, detail={
            "code": "email_verification_required", "message": "Verify your email to finish signing in.",
            "otp_sent": sent, "retry_after_seconds": remaining,
        })
    user.login_attempts = 0
    user.login_locked_until = None
    session.add(user)
    start_session(session, user, response)
    return user


@router.post("/forgot-password", response_model=Message)
def forgot_password(body: EmailRequest, session: Session = Depends(get_session)):
    message = Message(detail="If this email has an account, a password reset code has been sent.")
    user = find_user(session, body.email)
    if user is None:
        return message
    now = utcnow()
    challenge = session.get(PasswordReset, user.user_id)
    if challenge and aware(challenge.sent_at) + timedelta(seconds=60) > now:
        return message
    otp = f"{secrets.randbelow(1_000_000):06d}"
    if challenge is None:
        challenge = PasswordReset(user_id=user.user_id)
    challenge.otp_hash = hash_secret(otp)
    challenge.expires_at = now + timedelta(minutes=10)
    challenge.sent_at = now
    challenge.attempts = 0
    session.add(challenge)
    session.flush()
    try:
        email_service.send_password_reset_email(user.email, otp)
    except (OSError, RuntimeError, ValueError):
        session.rollback()
        raise HTTPException(503, "Password reset email could not be sent. Please try again later.") from None
    session.commit()
    return message


@router.post("/reset-password", response_model=Message)
def reset_password(body: ResetPasswordRequest, response: Response, session: Session = Depends(get_session)):
    user = find_user(session, body.email)
    challenge = session.get(PasswordReset, user.user_id) if user else None
    if not challenge or not challenge.otp_hash or not challenge.expires_at:
        raise HTTPException(400, "Invalid or expired reset code. Request a new code.")
    if aware(challenge.expires_at) <= utcnow():
        raise HTTPException(400, "This reset code has expired. Request a new code.")
    if challenge.attempts >= 5:
        raise HTTPException(429, "Too many incorrect reset codes. Request a new code.")
    if not verify_secret(body.otp, challenge.otp_hash):
        challenge.attempts += 1
        session.add(challenge)
        session.commit()
        raise HTTPException(400, "Incorrect password reset code.")
    user.password_hash = hash_secret(body.new_password)
    user.login_attempts = 0
    user.login_locked_until = None
    challenge.otp_hash = None
    challenge.expires_at = None
    session.add(user)
    session.add(challenge)
    session.exec(delete(AuthSession).where(AuthSession.user_id == user.user_id))
    session.commit()
    response.delete_cookie(COOKIE_NAME, path="/api", secure=secure_cookies(), httponly=True, samesite="lax")
    response.headers["Cache-Control"] = "no-store"
    return Message(detail="Password updated. Sign in with your new password.")


@router.get("/me", response_model=UserRead)
def me(response: Response, user: User = Depends(current_user)):
    response.headers["Cache-Control"] = "no-store"
    return user


@router.post("/logout", status_code=204)
def logout(request: Request, response: Response, session: Session = Depends(get_session)):
    token = request.cookies.get(COOKIE_NAME)
    record = session.get(AuthSession, token_hash(token)) if token else None
    if record:
        session.delete(record)
        session.commit()
    response.delete_cookie(COOKIE_NAME, path="/api", secure=secure_cookies(), httponly=True, samesite="lax")
