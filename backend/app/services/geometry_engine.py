"""The spatial-validation engine: does a set of furniture placements physically fit?

This is the geometric heart of RooMatch (graded core, step 3). Everything here is
pure computational geometry over the conventions fixed in `models/geometry.py`:
centimeters, origin at the room's top-left, +x right, +y DOWN, rotation in degrees
clockwise about an item's center.

Rules implemented:
  - in_bounds       every item sits fully inside the room (touching a wall is fine)
   - no_overlap      no item collides with another item or a fixed obstacle
"""
from itertools import combinations
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

def _door_opening(room: Room, door: Door) -> tuple[tuple,tuple, tuple]:
    """Return (near_xy, far_xy, inward_unit) for a door's opening.
    `near` is the opening endpoint at the wall's lower coordinate (at `offset_cm`),
    `far` the endpoint at `offset_cm + width_cm`, and `inward_unit` is the axis-
    aligned unit vector pointing from the wall into the room.
    """
    W, L = room.width_cm, room.length_cm
    o, w = door.offset_cm, door.width_cm
    if door.wall is Wall.north: # top wall, y=0, runs along x, inward = +y
        return(o, 0.0), (o+w, 0.0), (0.0,1.0)
    if door.wall is Wall.south: # bottom wall, y=L, runs along x, inward = -y
        return(o, L), (o+ w, L), (0.0, -1.0)
    if door.wall is Wall.west: # left wall, x=0, runs along y, inward = +x
        return (0.0,o), (0.0, o + w), (1.0, 0.0)
    return(W, o), (W,o + w), (-1.0, 0.0) # east: right wall, x=W, inward = -x

def door_swing_polygon(room: Room, door: Door) -> Polygon | None:
     """The quarter-disc a hinged door sweeps opening 90 degrees into the room.

    Returns None when the door swings outward — its arc is outside the room and
    constrains no interior furniture. The hinge sits on the lower-coordinate side
    of the opening when `hinge_left` is True, otherwise the higher-coordinate side.
    Because walls and inward directions are axis-aligned, the swept sector is an
    axis-aligned quarter-disc: the full disc (radius = leaf length = door width)
    clipped to the quadrant between the closed leaf (along the wall) and the open
    leaf (perpendicular, into the room).
    """

     if not door.swings_inward:
        return None
     near, far, inward = _door_opening(room, door)  
     hinge, other =(near, far)  if door.hinge_left else (far, near)
     r = door.width_cm
     along = (_sign(other[0]- hinge[0]), _sign(other[1]- hinge[1]))

     opposite=(
         hinge[0] + r * (along[0] + inward[0]),
         hinge[1] + r *(along[1] + inward[1]),
     )
     quadrant = box(
         min(hinge[0], opposite[0]), min(hinge[1], opposite[1]),
         max(hinge[0], opposite[0]), max(hinge[1], opposite[1]),
     )
     return Point(hinge). buffer(r).intersection(quadrant)


    
  


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

def _check_no_overlap(
        room: Room, Placements: list[Placement], polys: list[Polygon]
) -> RuleResult:
    """Noitem may overlap another item or a fixed obstacle already in the room"""
    clashes: list[str] = []

     # Item vs item: every unordered pair, via itertools.combinations.
    for i, j in combinations(range(len(polys)), 2):
        if polys[i].intersection(polys[j]).area > _AREA_EPS:
           clashes.append(f"{placements[i].product_id} x {placement[j].product_id}")

           # Item vs fixed furniture the user is keeping.
           fixed = [(fi.id, footprint_to_polygon(fi.footprint)) for fi in room .fixed_items]
           for placement, poly in zip(placements, polys):
               for fixed_id, fixed_poly in fixed:
                   if poly.intersection(fixed_poly).area > _AREA_EPS:
                       clashes.append(f"{placement.product_id} x fixed:{fixed_id}")

                       passed = not clashes
                       detail = None if passed else "overlaps: " + ",".join(clashes)
                       return RuleResult(rule="no_overlap", passed=passed, detail=detail)

def _check_clearance(
            room:Room,
            placements: list[Placement],
            polys: list[Polygon],
            min_clearance_cm: float,
    ) -> RuleResult:
          """Items must be either touching (gap 0, deliberate) or at least
    `min_clearance_cm` apart. A nonzero gap smaller than that is unusable dead
    space. Overlaps report as gap 0 here, so they stay silent — `no_overlap`
    already owns them and we avoid double-reporting."""
          clashes: list[str]= []
          for i, j in combinations(range(len(polys)), 2):
              gap = polys[i].distance(polys[j])
              if 0 < gap < min_clearance_cm:
                  clashes.append(
                      f"{placements[i].product_id} <-> {placements[j].product_id} ({gap:0f}cm)"
                  )
                  passed = not clashes
                  detail = None if passed else "tight gaps: " + ", ".join(clashes)
                  return RuleResult(rule="clearance", passed=passed, detail=detail)

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
        _check_no_overlap(room, placements, polys),
        _check_clearance(room, placements, polys, min_clearance_cm=10.0),  # Example clearance value
    ]
    return FitReport(valid=all(r.passed for r in rules), rules=rules)
