"""The spatial-validation engine: does a set of furniture placements physically fit?

This is the geometric heart of RooMatch (graded core, step 3). Everything here is
pure computational geometry over the conventions fixed in `models/geometry.py`:
centimeters, origin at the room's top-left, +x right, +y DOWN, rotation in degrees
clockwise about an item's center.

We lean on Shapely for the heavy polygon math (containment, intersection, distance)
and keep a thin layer of our own that (a) turns a Footprint into a polygon in room
space, (b) derives the keep-clear zones around doors, and (c) expresses each design
rule as a pass/fail `RuleResult`.

Rules implemented:
  - in_bounds       every item sits fully inside the room (touching a wall is fine)
  - no_overlap      no item collides with another item or a fixed obstacle
  - clearance       items are either touching or at least `min_clearance_cm` apart
  - door_clearance  nothing intrudes into a door's swing arc or entry passage
  - orientation     wall-anchored items (e.g. sofas) actually sit against a wall
"""

from itertools import combinations

from shapely.affinity import rotate
from shapely.geometry import Point, Polygon, box
from shapely.ops import unary_union

from ..models.geometry import Footprint
from ..models.layout import FitReport, Placement, RuleResult
from ..models.room import Door, Room, Wall

# Overlap areas below this (cm^2) are floating-point dust, not a real collision.
# Two rectangles that merely share an edge intersect in a line (area 0), so this
# threshold only ever absorbs rounding noise introduced by rotation.
_AREA_EPS = 1e-6


def _sign(value: float) -> float:
    """-1, 0, or +1 — used to read an axis-aligned direction off a delta."""
    return (value > 0) - (value < 0)


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


# --- door keep-clear zones (also drawn by the floor-plan editor later) ------

def _door_opening(room: Room, door: Door) -> tuple[tuple, tuple, tuple]:
    """Return (near_xy, far_xy, inward_unit) for a door's opening.

    `near` is the opening endpoint at the wall's lower coordinate (at `offset_cm`),
    `far` the endpoint at `offset_cm + width_cm`, and `inward_unit` is the axis-
    aligned unit vector pointing from the wall into the room.
    """
    W, L = room.width_cm, room.length_cm
    o, w = door.offset_cm, door.width_cm
    if door.wall is Wall.north:  # top wall, y=0, runs along x, inward = +y
        return (o, 0.0), (o + w, 0.0), (0.0, 1.0)
    if door.wall is Wall.south:  # bottom wall, y=L, runs along x, inward = -y
        return (o, L), (o + w, L), (0.0, -1.0)
    if door.wall is Wall.west:  # left wall, x=0, runs along y, inward = +x
        return (0.0, o), (0.0, o + w), (1.0, 0.0)
    return (W, o), (W, o + w), (-1.0, 0.0)  # east: right wall, x=W, inward = -x


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
    hinge, other = (near, far) if door.hinge_left else (far, near)
    r = door.width_cm
    # Unit vector along the wall, from the hinge toward the opening's far edge.
    along = (_sign(other[0] - hinge[0]), _sign(other[1] - hinge[1]))
    # Opposite corner of the quadrant: one leaf-length along the wall AND inward.
    opposite = (
        hinge[0] + r * (along[0] + inward[0]),
        hinge[1] + r * (along[1] + inward[1]),
    )
    quadrant = box(
        min(hinge[0], opposite[0]), min(hinge[1], opposite[1]),
        max(hinge[0], opposite[0]), max(hinge[1], opposite[1]),
    )
    return Point(hinge).buffer(r).intersection(quadrant)


def door_passage_polygon(room: Room, door: Door, depth_cm: float) -> Polygon:
    """A clear-entry rectangle across the doorway, extending `depth_cm` inward.

    This is what lets a person actually step into the room, so it applies no
    matter which way (or whether) the door swings.
    """
    near, far, inward = _door_opening(room, door)
    return Polygon([
        near,
        far,
        (far[0] + depth_cm * inward[0], far[1] + depth_cm * inward[1]),
        (near[0] + depth_cm * inward[0], near[1] + depth_cm * inward[1]),
    ])


def door_keep_clear_polygon(room: Room, door: Door, depth_cm: float) -> Polygon:
    """The whole region a door needs kept clear: swing arc + entry passage,
    clipped to the room so it is safe to draw and to test against."""
    parts = [door_passage_polygon(room, door, depth_cm)]
    swing = door_swing_polygon(room, door)
    if swing is not None:
        parts.append(swing)
    return unary_union(parts).intersection(room_polygon(room))


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
    room: Room, placements: list[Placement], polys: list[Polygon]
) -> RuleResult:
    """No item may overlap another item or a fixed obstacle already in the room."""
    clashes: list[str] = []

    # Item vs item: every unordered pair, via itertools.combinations.
    for i, j in combinations(range(len(polys)), 2):
        if polys[i].intersection(polys[j]).area > _AREA_EPS:
            clashes.append(f"{placements[i].product_id} x {placements[j].product_id}")

    # Item vs fixed furniture the user is keeping.
    fixed = [(fi.id, footprint_to_polygon(fi.footprint)) for fi in room.fixed_items]
    for placement, poly in zip(placements, polys):
        for fixed_id, fixed_poly in fixed:
            if poly.intersection(fixed_poly).area > _AREA_EPS:
                clashes.append(f"{placement.product_id} x fixed:{fixed_id}")

    passed = not clashes
    detail = None if passed else "overlaps: " + "; ".join(clashes)
    return RuleResult(rule="no_overlap", passed=passed, detail=detail)


def _check_clearance(
    room: Room,
    placements: list[Placement],
    polys: list[Polygon],
    min_clearance_cm: float,
) -> RuleResult:
    """Items must be either touching (gap 0, deliberate) or at least
    `min_clearance_cm` apart. A nonzero gap smaller than that is unusable dead
    space. Overlaps report as gap 0 here, so they stay silent — `no_overlap`
    already owns them and we avoid double-reporting."""
    clashes: list[str] = []
    for i, j in combinations(range(len(polys)), 2):
        gap = polys[i].distance(polys[j])
        if 0 < gap < min_clearance_cm:
            clashes.append(
                f"{placements[i].product_id} <-> {placements[j].product_id} ({gap:.0f}cm)"
            )
    passed = not clashes
    detail = None if passed else "tight gaps: " + "; ".join(clashes)
    return RuleResult(rule="clearance", passed=passed, detail=detail)


def _check_door_clearance(
    room: Room,
    placements: list[Placement],
    polys: list[Polygon],
    door_clearance_cm: float,
) -> RuleResult:
    """No placed item may intrude into any door's swing arc or entry passage."""
    clashes: list[str] = []
    for door in room.doors:
        region = door_keep_clear_polygon(room, door, door_clearance_cm)
        for placement, poly in zip(placements, polys):
            if poly.intersection(region).area > _AREA_EPS:
                clashes.append(f"{placement.product_id} blocks door:{door.id}")
    passed = not clashes
    detail = None if passed else "; ".join(clashes)
    return RuleResult(rule="door_clearance", passed=passed, detail=detail)


def _check_orientation(
    room: Room,
    placements: list[Placement],
    polys: list[Polygon],
    wall_anchored_ids: frozenset[str],
    wall_tol_cm: float,
) -> RuleResult:
    """Items that belong against a wall (sofas, TV consoles, bookshelves) must
    actually sit against one. We can't read "which face is the back" from a bare
    footprint, so the MVP rule is the honest, checkable version: such an item's
    polygon must come within `wall_tol_cm` of the room boundary (0 when flush).
    Which ids are wall-anchored is decided by the caller from product category,
    so this module stays pure geometry."""
    if not wall_anchored_ids:
        return RuleResult(rule="orientation", passed=True)
    boundary = room_polygon(room).exterior
    offenders: list[str] = []
    for placement, poly in zip(placements, polys):
        anchored = placement.product_id in wall_anchored_ids
        if anchored and poly.distance(boundary) > wall_tol_cm:
            offenders.append(placement.product_id)
    passed = not offenders
    detail = None if passed else "not against a wall: " + ", ".join(offenders)
    return RuleResult(rule="orientation", passed=passed, detail=detail)


def validate_layout(
    room: Room,
    placements: list[Placement],
    *,
    min_clearance_cm: float = 30.0,
    door_clearance_cm: float = 60.0,
    wall_anchored_ids: frozenset[str] = frozenset(),
    wall_tol_cm: float = 15.0,
) -> FitReport:
    """Run every spatial rule over a layout and return a per-rule FitReport.

    `valid` is the logical AND of every rule, so a layout is only accepted when
    it passes all of them. Callers get the full per-rule breakdown either way,
    which is what the UI and the evaluation harness need. The clearance
    thresholds and the wall-anchored set are tunable so evaluation can study
    their effect and so callers own product policy.
    """
    polys = [footprint_to_polygon(p.footprint) for p in placements]
    rules = [
        _check_in_bounds(room, placements, polys),
        _check_no_overlap(room, placements, polys),
        _check_clearance(room, placements, polys, min_clearance_cm),
        _check_door_clearance(room, placements, polys, door_clearance_cm),
        _check_orientation(room, placements, polys, wall_anchored_ids, wall_tol_cm),
    ]
    return FitReport(valid=all(r.passed for r in rules), rules=rules)
