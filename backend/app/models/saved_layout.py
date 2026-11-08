"""Saved-layout API contract using the ERD's cm center coordinates."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator

from .product import Product
from .room import Door, Window


class Dimensions(BaseModel):
    width_cm: float = Field(gt=0, le=2000, allow_inf_nan=False)
    depth_cm: float = Field(gt=0, le=2000, allow_inf_nan=False)
    height_cm: float | None = Field(default=None, gt=0, le=2000, allow_inf_nan=False)


class OpeningConfig(BaseModel):
    room_id: str = Field(default="editor-room", max_length=120)
    height_cm: float | None = Field(default=None, gt=0, le=2000, allow_inf_nan=False)
    doors: list[Door] = Field(default_factory=list, max_length=100)
    windows: list[Window] = Field(default_factory=list, max_length=100)


class Appearance(BaseModel):
    wall_color: str = Field(default="#ece7e0", pattern=r"^#[0-9a-fA-F]{6}$")
    wall_finish_id: str = Field(default="paint", max_length=40)
    floor_id: str = Field(default="light-wood", max_length=40)


class ItemWrite(BaseModel):
    item_id: UUID | None = None
    product_id: str | None = Field(default=None, max_length=128)
    x_position_cm: float = Field(allow_inf_nan=False)
    y_position_cm: float = Field(allow_inf_nan=False)
    rotation_deg: int = Field(default=0, ge=0, lt=360)
    is_fixed: bool = False
    custom_dimensions: Dimensions | None = None
    label: str | None = Field(default=None, max_length=120)

    @model_validator(mode="after")
    def custom_item_has_dimensions(self):
        if self.product_id is None and self.custom_dimensions is None:
            raise ValueError("Custom or owned items require dimensions.")
        if self.product_id is not None and self.custom_dimensions is not None:
            raise ValueError("Catalog items use their catalog dimensions.")
        return self


class LayoutWrite(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1, max_length=120)
    room_width_cm: float = Field(gt=0, le=2000, allow_inf_nan=False)
    room_length_cm: float = Field(gt=0, le=2000, allow_inf_nan=False)
    door_window_config: OpeningConfig = Field(default_factory=OpeningConfig)
    budget_pkr: int | None = Field(default=None, ge=0)
    appearance: Appearance = Field(default_factory=Appearance)
    items: list[ItemWrite] = Field(default_factory=list, max_length=500)

    @model_validator(mode="after")
    def validate_details(self):
        self.name = self.name.strip()
        if not self.name:
            raise ValueError("Give the layout a name.")
        ids = [item.item_id for item in self.items if item.item_id is not None]
        if len(set(ids)) != len(ids):
            raise ValueError("Each placed item must have a unique item_id.")
        openings = [*self.door_window_config.doors, *self.door_window_config.windows]
        if len({opening.id for opening in openings}) != len(openings):
            raise ValueError("Each opening must have a unique id.")
        for opening in openings:
            extent = self.room_width_cm if opening.wall.value in {"north", "south"} else self.room_length_cm
            if opening.offset_cm + opening.width_cm > extent:
                raise ValueError("Doors and windows must fit along their wall.")
        return self


class LayoutRename(BaseModel):
    name: str = Field(min_length=1, max_length=120)

    @model_validator(mode="after")
    def nonblank(self):
        self.name = self.name.strip()
        if not self.name:
            raise ValueError("Give the layout a name.")
        return self


class LayoutSummary(BaseModel):
    layout_id: UUID
    name: str
    room_width_cm: float
    room_length_cm: float
    updated_at: datetime
    item_count: int
    budget_pkr: int | None


class ItemRead(ItemWrite):
    item_id: UUID
    product: Product | None = None


class LayoutRead(LayoutWrite):
    layout_id: UUID
    user_id: UUID
    updated_at: datetime
    items: list[ItemRead]
