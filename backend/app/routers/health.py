from fastapi import APIRouter
from sqlalchemy import func
from sqlmodel import Session, select

from ..database import get_engine
from ..models.catalog import CatalogProduct

router = APIRouter(tags=["health"])


@router.get("/health")
def health() -> dict[str, str]:
    """Liveness check used by the frontend and by tests."""
    return {"status": "ok"}


@router.get("/health/database")
def database_health() -> dict[str, str | int]:
    """Readiness check: confirms a real connection and the imported catalog."""
    engine = get_engine()
    with Session(engine) as session:
        count = session.exec(select(func.count()).select_from(CatalogProduct)).one()
    return {"status": "ok", "database": engine.dialect.name, "products": count}
