"""Geometry primitives and the conventions used across all of RooMatch.

CONVENTIONS (relied on by the room model, catalog, and the spatial engine):

- Units: centimeters (cm). No other unit ever appears in the data model.
- Coordinate system: 2D top-down. Origin (0, 0) is the TOP-LEFT corner of the
  room. +x points right, +y points DOWN (the screen / Konva convention). A room
  of width W and length L therefore spans (0, 0) -> (W, L).
- Rotation: degrees, clockwise, measured about an item's CENTER. The MVP only
  uses 0 / 90 / 180 / 270, but the field is a float so we are not boxed in.

Keeping these in one place means the floor-plan editor, the recommendation
engine, and the spatial-validation engine all speak exactly the same language.
"""

from pydantic import BaseModel, Field


class Point(BaseModel):
    """A point in room space, in centimeters."""

    x: float
    y: float


class Footprint(BaseModel):
    """A rectangle placed by its center point plus a rotation.

    This is the single shape the spatial-validation engine reasons about: a
    piece of furniture, a fixed item, or a door-swing zone can all be expressed
    as a footprint. `width_cm` runs along the item's local x-axis and `depth_cm`
    along its local y-axis before rotation is applied.
    """

    center: Point
    width_cm: float = Field(gt=0)
    depth_cm: float = Field(gt=0)
    rotation_deg: float = 0.0
