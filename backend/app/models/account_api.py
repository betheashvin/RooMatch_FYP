"""Validated account requests; secrets never appear in response models."""

import re
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field, field_validator


class EmailRequest(BaseModel):
    email: str = Field(max_length=254)

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        value = value.strip().lower()
        if not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", value):
            raise ValueError("Enter a valid email address.")
        return value


class Credentials(EmailRequest):
    password: str = Field(min_length=8, max_length=128)


class VerifyRequest(EmailRequest):
    otp: str = Field(pattern=r"^\d{6}$")


class ResetPasswordRequest(VerifyRequest):
    new_password: str = Field(min_length=8, max_length=128)


class UserRead(BaseModel):
    user_id: UUID
    email: str
    is_verified: bool
    created_at: datetime


class Message(BaseModel):
    detail: str
