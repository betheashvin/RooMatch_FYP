"""POST /api/validate — run the spatial-validation engine over a proposed layout.

This is the HTTP surface for the graded geometry core: the frontend sends a room
plus the products it has placed, and gets back the per-rule FitReport. The one
piece of product policy lives here (not in the pure-geometry engine)
"""

from fastapi import APIRouter
from pydantic import BaseModel, Field

from ..models.layout import FitReport, Placement
from ..models.product import Category
from ..models.room import Room
from ..services.catalog_repo import get_product
from ..services.geometry_engine import validate_layout

router = APIRouter(prefix="/validate", tags=["validate"])


class ValidateRequest(BaseModel):
    """A room plus the products placed in it, with optional clearance tuning."""

    room: Room
    placements: list[Placement] = []



@router.post("", response_model=FitReport)
def validate(req: ValidateRequest) -> FitReport:
    """Validate a proposed furniture layout and return the per-rule verdict."""
    return validate_layout(
        req.room,
        req.placements,
    )
