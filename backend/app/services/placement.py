"""Auto-placement for a recommended set (graded core, step 5).

Turns the recommendation engine's "which pieces" decision into "placed where": a
deterministic, interior-design-informed arrangement of a living-room set in the
room, then re-checked by the spatial-validation engine
(`geometry_engine.validate_layout`). The result is an authoritative `Layout` —
products, positions, cost, and a per-rule fit report.

Arrangement (origin top-left, +x right, +y DOWN):
  - primary seating (sofa/loveseat) centered against the far (south) wall;
  - wall storage (TV console/bookshelf) centered against the near (north) wall;
  - coffee table centered in front of the sofa, a walkway gap away;
  - an accent chair against the west side and a floor lamp in a north corner;
  - optional side table touching the sofa's end; ottoman beside the coffee table;
  - a rug centered under the seating group.

A rug is a floor covering, not an obstacle, so it is placed for rendering but
excluded from the overlap/clearance checks — the 2D engine would otherwise treat
it as colliding with whatever sits on it.
"""

from ..models.geometry import Footprint, Point
from ..models.layout import Layout, Placement
from ..models.product import Category, Product
from ..models.recommend import CategoryPreference
from ..models.room import Room
from .geometry_engine import validate_layout
from .recommend import recommend

_WALL_ANCHORED = {Category.sofa, Category.loveseat, Category.tv_console, Category.bookshelf}
_FLOOR_LAYER = {Category.rug}
_WALKWAY_CM = 45.0  # clear gap in front of the sofa for the coffee table
_WALL_GAP_CM = 10.0  # keep free-standing items a touch off the wall


def _footprint(product: Product, x: float, y: float, rotation: float = 0.0) -> Footprint:
    return Footprint(
        center=Point(x=x, y=y),
        width_cm=product.width_cm,
        depth_cm=product.depth_cm,
        rotation_deg=rotation,
    )


def place_set(room: Room, products: list[Product]) -> list[Placement]:
    """Arrange a set of products in the room and return their placements."""
    width, length = room.width_cm, room.length_cm
    cx = width / 2
    placements: list[Placement] = []

    def first(*categories: Category) -> Product | None:
        return next((p for p in products if p.category in categories), None)

    sofa = first(Category.sofa, Category.loveseat)
    storage = first(Category.tv_console, Category.bookshelf)
    table = first(Category.coffee_table)
    chair = first(Category.armchair)
    side = first(Category.side_table)
    lamp = first(Category.lighting)
    ottoman = first(Category.ottoman)
    rug = first(Category.rug)

    sofa_inner_y = length
    if sofa is not None:
        placements.append(Placement(product_id=sofa.id, footprint=_footprint(sofa, cx, length - sofa.depth_cm / 2)))
        sofa_inner_y = length - sofa.depth_cm

    if storage is not None:
        placements.append(Placement(product_id=storage.id, footprint=_footprint(storage, cx, storage.depth_cm / 2)))

    table_y = sofa_inner_y
    if table is not None:
        table_y = sofa_inner_y - _WALKWAY_CM - table.depth_cm / 2
        placements.append(Placement(product_id=table.id, footprint=_footprint(table, cx, table_y)))

    if chair is not None:
        x = chair.width_cm / 2 + _WALL_GAP_CM
        y = min(max(chair.depth_cm / 2, length * 0.45), length - chair.depth_cm / 2)
        placements.append(Placement(product_id=chair.id, footprint=_footprint(chair, x, y)))

    if lamp is not None:
        x = width - lamp.width_cm / 2 - _WALL_GAP_CM
        y = lamp.depth_cm / 2 + _WALL_GAP_CM
        placements.append(Placement(product_id=lamp.id, footprint=_footprint(lamp, x, y)))

    if side is not None and sofa is not None:
        # against the south wall, touching the sofa's right end (gap 0 is allowed)
        x = min(cx + sofa.width_cm / 2 + side.width_cm / 2, width - side.width_cm / 2)
        placements.append(Placement(product_id=side.id, footprint=_footprint(side, x, length - side.depth_cm / 2)))

    if ottoman is not None:
        table_half = table.width_cm / 2 if table is not None else 0.0
        x = min(cx + table_half + ottoman.width_cm / 2 + 40, width - ottoman.width_cm / 2)
        y = table_y if table is not None else sofa_inner_y - ottoman.depth_cm / 2 - 20
        placements.append(Placement(product_id=ottoman.id, footprint=_footprint(ottoman, x, y)))

    if rug is not None:
        placements.append(Placement(product_id=rug.id, footprint=_footprint(rug, cx, length / 2)))

    return placements


def plan_layout(
    room: Room,
    products: list[Product],
    budget_pkr: int,
    *,
    min_clearance_cm: float = 30.0,
    door_clearance_cm: float = 60.0,
) -> Layout:
    """Place `products` in the room, validate the standing furniture, and return
    the authoritative `Layout` (placements incl. rug, cost, and fit report)."""
    by_id = {p.id: p for p in products}
    placements = place_set(room, products)

    # Floor coverings (rugs) are placed but excluded from collision checks.
    obstacles = [pl for pl in placements if by_id[pl.product_id].category not in _FLOOR_LAYER]
    wall_ids = frozenset(
        pl.product_id for pl in obstacles if by_id[pl.product_id].category in _WALL_ANCHORED
    )
    report = validate_layout(
        room,
        obstacles,
        min_clearance_cm=min_clearance_cm,
        door_clearance_cm=door_clearance_cm,
        wall_anchored_ids=wall_ids,
    )

    total = sum(by_id[pl.product_id].price_pkr for pl in placements)
    return Layout(
        room_id=room.id,
        placements=placements,
        total_price_pkr=total,
        budget_pkr=budget_pkr,
        within_budget=total <= budget_pkr,
        fit_report=report,
    )


def recommend_layout(
    room: Room,
    budget_pkr: int,
    *,
    style_tags: list[str] | None = None,
    style_seed_product_id: str | None = None,
    catalog: list[Product] | None = None,
    categories: list[Category] | None = None,
    preferences: dict[Category, CategoryPreference] | None = None,
    colors: list[str] | None = None,
) -> Layout:
    """End to end: pick a budget-aware set (step 4) then place and validate it
    (step 5) into one authoritative `Layout`."""
    chosen = recommend(
        room,
        budget_pkr,
        style_tags=style_tags,
        style_seed_product_id=style_seed_product_id,
        catalog=catalog,
        categories=categories,
        preferences=preferences,
        colors=colors,
    )
    products = [item.product for item in chosen.items]
    return plan_layout(room, products, budget_pkr)
