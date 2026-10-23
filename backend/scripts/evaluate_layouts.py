"""First evaluation of the spatial-validation engine (Phase I, step 6.2).

Runs a handful of representative living-room layouts through the same code path
the API uses and checks each against its expected verdict, then reports the
budget picture alongside. This is the project's first end-to-end sanity check
that "placement validity + budget" behaves — not a unit test but a small,
readable evaluation harness we can grow later.

Run from the project root:
    PYTHONPATH=backend backend/.venv/Scripts/python.exe backend/scripts/evaluate_layouts.py
"""

from app.models.geometry import Footprint, Point
from app.models.layout import Placement
from app.models.room import Door, Room, Wall
from app.routers.validate import _wall_anchored_ids
from app.services.catalog_repo import get_product
from app.services.geometry_engine import validate_layout

# A 400 x 300 cm living room with one inward-swinging door on the north wall —
# the same default the floor-plan editor starts with.
ROOM = Room(
    id="eval-room",
    width_cm=400,
    length_cm=300,
    doors=[Door(id="main", wall=Wall.north, offset_cm=100, width_cm=80)],
)


def place(product_id: str, x: float, y: float, rot: float = 0.0) -> Placement:
    """A placement that borrows its real footprint from the catalog."""
    product = get_product(product_id)
    assert product is not None, f"unknown product {product_id}"
    return Placement(
        product_id=product_id,
        footprint=Footprint(
            center=Point(x=x, y=y),
            width_cm=product.width_cm,
            depth_cm=product.depth_cm,
            rotation_deg=rot,
        ),
    )


def cost_of(placements: list[Placement]) -> int:
    total = 0
    for p in placements:
        product = get_product(p.product_id)
        if product is not None:
            total += product.price_pkr
    return total


# A tidy, buildable layout reused by a couple of scenarios: sofa flush to the
# south wall, TV console flush north (clear of the door), coffee table centred.
GOOD_LAYOUT = [
    place("sofa-001", 200, 255),  # 210x90, flush south wall
    place("tv-001", 300, 20),     # 150x40, flush north wall, east of the door
    place("table-001", 200, 140), # 110x60, centred, 40 cm off the sofa
]

SCENARIOS = [
    {
        "name": "Balanced corner layout",
        "placements": GOOD_LAYOUT,
        "budget": 200_000,
        "expected_valid": True,
    },
    {
        "name": "Sofa + table overlapping",
        "placements": [place("sofa-001", 200, 150), place("table-001", 200, 150)],
        "budget": 150_000,
        "expected_valid": False,
    },
    {
        "name": "Coffee table blocking the door",
        "placements": [place("sofa-001", 200, 255), place("table-001", 140, 40)],
        "budget": 150_000,
        "expected_valid": False,
    },
    {
        "name": "Sofa floating in the middle",
        "placements": [place("sofa-001", 200, 150)],
        "budget": 150_000,
        "expected_valid": False,
    },
    {
        "name": "Good layout, tight budget",
        "placements": GOOD_LAYOUT,
        "budget": 100_000,
        "expected_valid": True,
    },
]


def main() -> None:
    print(f"Room: {ROOM.width_cm} x {ROOM.length_cm} cm, "
          f"{len(ROOM.doors)} door(s)\n")
    header = f"{'Scenario':<32} {'valid':<6} {'expected':<9} {'failed rules':<28} {'cost':>9} {'budget':>9} {'fits'}"
    print(header)
    print("-" * len(header))

    passed = 0
    for s in SCENARIOS:
        placements = s["placements"]
        report = validate_layout(
            ROOM, placements, wall_anchored_ids=_wall_anchored_ids(placements)
        )
        failed = ",".join(r.rule for r in report.rules if not r.passed) or "-"
        cost = cost_of(placements)
        budget = s["budget"]
        fits = cost <= budget
        ok = report.valid == s["expected_valid"]
        passed += ok
        print(
            f"{s['name']:<32} {str(report.valid):<6} {str(s['expected_valid']):<9} "
            f"{failed:<28} {cost:>9,} {budget:>9,} {'yes' if fits else 'OVER'}"
        )

    print("-" * len(header))
    print(f"\nValidity behaved as expected in {passed}/{len(SCENARIOS)} scenarios.")


if __name__ == "__main__":
    main()
