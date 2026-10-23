"""The authoritative output types: where products go and whether the layout is valid.

These are defined now so the whole system shares one result shape, but they are a
light stub for steps 1-2. The spatial-validation engine (step 3) is what actually
produces `Placement`s and fills in the `FitReport`.
"""

from pydantic import BaseModel

from .geometry import Footprint


class Placement(BaseModel):
    """One product placed in the room."""

    product_id: str
    footprint: Footprint


class RuleResult(BaseModel):
    """The pass/fail outcome of a single spatial rule, e.g. `no_overlap`."""

    rule: str
    passed: bool
    detail: str | None = None


class FitReport(BaseModel):
    """Per-rule verdict for a whole layout. `valid` is the AND of every rule."""

    valid: bool
    rules: list[RuleResult] = []


class Layout(BaseModel):
    """A complete, authoritative recommendation: which products, placed where,
    at what total cost, plus the fit report. This is what gets graded."""

    room_id: str
    placements: list[Placement] = []
    total_price_pkr: int = 0
    budget_pkr: int | None = None
    within_budget: bool | None = None
    fit_report: FitReport | None = None
