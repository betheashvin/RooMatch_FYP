"""The spatial-validation engine: does a set of furniture placements physically fit?

This is the geometric heart of RooMatch (graded core, step 3). Everything here is
pure computational geometry over the conventions fixed in `models/geometry.py`:
centimeters, origin at the room's top-left, +x right, +y DOWN, rotation in degrees
clockwise about an item's center.

Rules implemented:
  - in_bounds       every item sits fully inside the room (touching a wall is fine)
"""

from shapely.affinity import rotate
from shapely.geometry import Polygon, box

from ..models.geometry import Footprint
from ..models.layout import FitReport, Placement, RuleResult
from ..models.room import Room

# Overlap areas below this (cm^2) are floating-point dust, not a real collision.
# Two rectangles that merely share an edge intersect in a line (area 0), so this
# threshold only ever absorbs rounding noise introduced by rotation.
_AREA_EPS = 1e-6

# --- the footprint -> polygon primitive -------------------------------------

def footprint_to_polygon(fp: Footprint) -> Polygon:
    """Convert a Footprint (center, size, rotation) into a room-space polygon.

    We build the axis-aligned rectangle first — centered on the footprint's
    center — then rotate it about that same center. Shapely rotates
    counter-clockwise for a positive angle in its own math frame; because our
    y-axis points DOWN, that identical positive angle reads as *clockwise* on
    screen, which is exactly our convention. So we pass `rotation_deg` straight
    through with no sign flip.
    """
    cx, cy = fp.center.x, fp.center.y
    half_w, half_d = fp.width_cm / 2, fp.depth_cm / 2
    rect = box(cx - half_w, cy - half_d, cx + half_w, cy + half_d)
    if fp.rotation_deg % 360 != 0:
        rect = rotate(rect, fp.rotation_deg, origin=(cx, cy))
    return rect


def room_polygon(room: Room) -> Polygon:
    """The room interior as a rectangle spanning (0, 0) -> (width, length)."""
    return box(0, 0, room.width_cm, room.length_cm)


# --- the rules --------------------------------------------------------------

def _check_in_bounds(
    room: Room, placements: list[Placement], polys: list[Polygon]
) -> RuleResult:
    """Every item must lie fully inside the room. Touching a wall is allowed."""
    room_poly = room_polygon(room)
    offenders: list[str] = []
    for placement, poly in zip(placements, polys):
        # How much of the item pokes outside the room? (0 when fully contained,
        # including when it sits flush against a wall.)
        outside = poly.area - poly.intersection(room_poly).area
        if outside > _AREA_EPS:
            offenders.append(placement.product_id)
    passed = not offenders
    detail = None if passed else "outside room: " + ", ".join(offenders)
    return RuleResult(rule="in_bounds", passed=passed, detail=detail)


def validate_layout(
    room: Room,
    placements: list[Placement],
) -> FitReport:
    """Run every spatial rule over a layout and return a per-rule FitReport.

    `valid` is the logical AND of every rule, so a layout is only accepted when
    it passes all of them. Callers get the full per-rule breakdown either way,
    which is what the UI and the evaluation harness need. 
    """
    polys = [footprint_to_polygon(p.footprint) for p in placements]
    rules = [
        _check_in_bounds(room, placements, polys),
    ]
    return FitReport(valid=all(r.passed for r in rules), rules=rules)
