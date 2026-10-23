"""The room model: what the floor-plan editor produces and the spatial engine consumes.

A room is a rectangle (MVP) with three kinds of typed obstacle placed on or in
it: doors (which also carry a swing zone), windows, and fixed furniture the user
wants to keep. Everything is in centimeters, in the coordinate system described
in `geometry.py`.
"""

from enum import Enum

from pydantic import BaseModel, Field

from .geometry import Footprint


class Wall(str, Enum):
    """Which wall an opening sits on. Offsets are measured from the wall's
    lower-coordinate corner (the corner nearer the origin)."""

    north = "north"  # top wall, y = 0
    south = "south"  # bottom wall, y = length_cm
    west = "west"  # left wall, x = 0
    east = "east"  # right wall, x = width_cm


class Door(BaseModel):
    """A doorway on a wall. The clear-swing zone is derived by the spatial
    engine from these primitives, not stored here."""

    id: str
    wall: Wall
    offset_cm: float = Field(ge=0)  # distance along the wall to the door's near edge
    width_cm: float = Field(gt=0)
    swings_inward: bool = True
    hinge_left: bool = True  # hinge on the lower-coordinate side of the opening


class Window(BaseModel):
    """A window on a wall. Furniture should not fully block it."""

    id: str
    wall: Wall
    offset_cm: float = Field(ge=0)
    width_cm: float = Field(gt=0)
    sill_height_cm: float | None = None


class FixedItem(BaseModel):
    """Existing furniture the user keeps. Treated as an immovable obstacle."""

    id: str
    label: str
    footprint: Footprint


class Room(BaseModel):
    """A living room to be furnished. `width_cm` is the x-extent, `length_cm`
    the y-extent (depth). Height is optional and unused by the 2D engine."""

    id: str
    name: str = "Living room"
    width_cm: float = Field(gt=0)
    length_cm: float = Field(gt=0)
    height_cm: float | None = None
    doors: list[Door] = []
    windows: list[Window] = []
    fixed_items: list[FixedItem] = []
