"""Account, session and saved-layout tables for ERD v2."""

from datetime import datetime, timezone
from uuid import UUID, uuid4

from sqlalchemy import CheckConstraint, Column, DateTime, Text
from sqlmodel import Field, SQLModel

from .catalog import json_column


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def timestamp() -> Column:
    return Column(DateTime(timezone=True), nullable=False)


class User(SQLModel, table=True):
    __tablename__ = "users"

    user_id: UUID = Field(default_factory=uuid4, primary_key=True)
    email: str = Field(max_length=254, unique=True, index=True)
    password_hash: str = Field(sa_column=Column(Text, nullable=False))
    is_verified: bool = False
    created_at: datetime = Field(default_factory=utcnow, sa_column=timestamp())
    otp_hash: str | None = None
    otp_expires_at: datetime | None = Field(default=None, sa_type=DateTime(timezone=True))
    otp_sent_at: datetime | None = Field(default=None, sa_type=DateTime(timezone=True))
    otp_attempts: int = 0
    login_attempts: int = 0
    login_locked_until: datetime | None = Field(default=None, sa_type=DateTime(timezone=True))


class AuthSession(SQLModel, table=True):
    __tablename__ = "auth_sessions"

    token_hash: str = Field(primary_key=True, max_length=64)
    user_id: UUID = Field(foreign_key="users.user_id", ondelete="CASCADE", index=True)
    expires_at: datetime = Field(sa_column=timestamp())


class PasswordReset(SQLModel, table=True):
    """A separate challenge prevents signup OTPs from resetting passwords."""
    __tablename__ = "password_resets"

    user_id: UUID = Field(primary_key=True, foreign_key="users.user_id", ondelete="CASCADE")
    otp_hash: str | None = None
    expires_at: datetime | None = Field(default=None, sa_type=DateTime(timezone=True))
    sent_at: datetime = Field(default_factory=utcnow, sa_column=timestamp())
    attempts: int = 0


class SavedLayout(SQLModel, table=True):
    __tablename__ = "layouts"
    __table_args__ = (
        CheckConstraint("room_width_cm > 0 AND room_length_cm > 0", name="ck_layout_room_dimensions"),
    )

    layout_id: UUID = Field(default_factory=uuid4, primary_key=True)
    user_id: UUID = Field(foreign_key="users.user_id", ondelete="CASCADE", index=True)
    name: str = Field(max_length=120)
    room_width_cm: float
    room_length_cm: float
    door_window_config: dict = Field(default_factory=dict, sa_column=json_column())
    budget_pkr: int | None = None
    appearance: dict = Field(default_factory=dict, sa_column=json_column())
    updated_at: datetime = Field(default_factory=utcnow, sa_column=timestamp())


class LayoutItem(SQLModel, table=True):
    __tablename__ = "layout_items"

    item_id: UUID = Field(default_factory=uuid4, primary_key=True)
    layout_id: UUID = Field(foreign_key="layouts.layout_id", ondelete="CASCADE", index=True)
    product_id: str | None = Field(default=None, foreign_key="products.id", index=True)
    x_position_cm: float
    y_position_cm: float
    rotation_deg: int = 0
    is_fixed: bool = False
    custom_dimensions: dict | None = Field(default=None, sa_column=json_column(nullable=True))
    label: str | None = Field(default=None, max_length=120)
    sort_order: int = 0
