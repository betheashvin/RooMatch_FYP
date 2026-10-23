"""POST /api/validate — run the spatial-validation engine over a proposed layout.

This is the HTTP surface for the graded geometry core: the frontend sends a room
plus the products it has placed, and gets back the per-rule FitReport. The one
piece of product policy lives here (not in the pure-geometry engine): which
categories are meant to stand against a wall, which feeds the orientation rule.
"""

from fastapi import APIRouter
from pydantic import BaseModel, Field

from ..models.layout import FitReport, Placement
from ..models.product import Category
from ..models.room import Room
from ..services.catalog_repo import get_product
from ..services.geometry_engine import validate_layout

router = APIRouter(prefix="/validate", tags=["validate"])

# Categories whose pieces belong against a wall. Kept here, not in the engine,
# because it is product policy rather than geometry.
WALL_ANCHORED_CATEGORIES = {
    Category.sofa,
    Category.loveseat,
    Category.tv_console,
    Category.bookshelf,
}


class ValidateRequest(BaseModel):
    """A room plus the products placed in it, with optional clearance tuning."""

    room: Room
    placements: list[Placement] = []
    min_clearance_cm: float = Field(default=30.0, gt=0)
    door_clearance_cm: float = Field(default=60.0, gt=0)


def _wall_anchored_ids(placements: list[Placement]) -> frozenset[str]:
    """Product ids in the layout whose catalog category should sit against a wall."""
    ids = {
        p.product_id
        for p in placements
        if (product := get_product(p.product_id)) is not None
        and product.category in WALL_ANCHORED_CATEGORIES
    }
    return frozenset(ids)


@router.post("", response_model=FitReport)
def validate(req: ValidateRequest) -> FitReport:
    """Validate a proposed furniture layout and return the per-rule verdict."""
    return validate_layout(
        req.room,
        req.placements,
        min_clearance_cm=req.min_clearance_cm,
        door_clearance_cm=req.door_clearance_cm,
        wall_anchored_ids=_wall_anchored_ids(req.placements),
    )
