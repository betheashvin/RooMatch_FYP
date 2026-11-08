"""Owner-scoped, transactional layout CRUD."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy import delete, func
from sqlmodel import Session, select

from ..database import get_session
from ..models.accounts import LayoutItem, SavedLayout, User, utcnow
from ..models.catalog import CatalogProduct, CatalogSeller
from ..models.saved_layout import ItemRead, LayoutRead, LayoutRename, LayoutSummary, LayoutWrite
from ..services.auth import check_origin, current_user
from ..services.catalog_repo import _to_product

router = APIRouter(prefix="/layouts", tags=["saved layouts"], dependencies=[Depends(check_origin)])


def owned_layout(session: Session, layout_id: UUID, user: User, *, lock: bool = False) -> SavedLayout:
    query = select(SavedLayout).where(SavedLayout.layout_id == layout_id, SavedLayout.user_id == user.user_id)
    if lock:
        query = query.with_for_update()
    layout = session.exec(query).first()
    if layout is None:
        raise HTTPException(404, "Layout not found.")
    return layout


def layout_read(session: Session, layout: SavedLayout) -> LayoutRead:
    rows = session.exec(select(LayoutItem).where(LayoutItem.layout_id == layout.layout_id)
                        .order_by(LayoutItem.sort_order)).all()
    products = {}
    items = []
    for row in rows:
        if row.product_id and row.product_id not in products:
            product = session.get(CatalogProduct, row.product_id)
            seller = session.get(CatalogSeller, product.seller_id)
            products[row.product_id] = _to_product(product, seller)
        items.append(ItemRead(**row.model_dump(exclude={"layout_id", "sort_order"}),
                              product=products.get(row.product_id)))
    return LayoutRead(**layout.model_dump(), items=items)


def validate_items(session: Session, body: LayoutWrite, layout_id: UUID | None = None) -> None:
    for item in body.items:
        if item.product_id and session.get(CatalogProduct, item.product_id) is None:
            raise HTTPException(422, f"Unknown product: {item.product_id}")
        if item.item_id:
            existing = session.get(LayoutItem, item.item_id)
            if existing and existing.layout_id != layout_id:
                raise HTTPException(422, "Item ID is already in use. Use a new ID for a new item.")


def write_items(session: Session, layout: SavedLayout, body: LayoutWrite) -> None:
    for index, item in enumerate(body.items):
        values = item.model_dump(exclude_none=True)
        session.add(LayoutItem(layout_id=layout.layout_id, sort_order=index, **values))


@router.get("", response_model=list[LayoutSummary])
def list_layouts(response: Response, user: User = Depends(current_user), session: Session = Depends(get_session),
                 offset: int = Query(default=0, ge=0), limit: int = Query(default=100, ge=1, le=100)):
    response.headers["Cache-Control"] = "no-store"
    rows = session.exec(select(SavedLayout, func.count(LayoutItem.item_id))
                        .outerjoin(LayoutItem, LayoutItem.layout_id == SavedLayout.layout_id)
                        .where(SavedLayout.user_id == user.user_id)
                        .group_by(SavedLayout.layout_id)
                        .order_by(SavedLayout.updated_at.desc(), SavedLayout.layout_id)
                        .offset(offset).limit(limit)).all()
    return [LayoutSummary(**layout.model_dump(), item_count=count) for layout, count in rows]


@router.post("", response_model=LayoutRead, status_code=201)
def create_layout(body: LayoutWrite, user: User = Depends(current_user), session: Session = Depends(get_session)):
    validate_items(session, body)
    layout = SavedLayout(user_id=user.user_id, **body.model_dump(exclude={"items"}))
    session.add(layout)
    session.flush()
    write_items(session, layout, body)
    session.commit()
    session.refresh(layout)
    return layout_read(session, layout)


@router.get("/{layout_id}", response_model=LayoutRead)
def get_layout(layout_id: UUID, response: Response, user: User = Depends(current_user),
               session: Session = Depends(get_session)):
    response.headers["Cache-Control"] = "no-store"
    return layout_read(session, owned_layout(session, layout_id, user))


@router.put("/{layout_id}", response_model=LayoutRead)
def update_layout(layout_id: UUID, body: LayoutWrite, user: User = Depends(current_user),
                  session: Session = Depends(get_session)):
    layout = owned_layout(session, layout_id, user, lock=True)
    validate_items(session, body, layout_id)
    for key, value in body.model_dump(exclude={"items"}).items():
        setattr(layout, key, value)
    layout.updated_at = utcnow()
    session.add(layout)
    session.exec(delete(LayoutItem).where(LayoutItem.layout_id == layout_id))
    session.flush()
    write_items(session, layout, body)
    session.commit()
    session.refresh(layout)
    return layout_read(session, layout)


@router.patch("/{layout_id}", response_model=LayoutRead)
def rename_layout(layout_id: UUID, body: LayoutRename, user: User = Depends(current_user),
                  session: Session = Depends(get_session)):
    layout = owned_layout(session, layout_id, user, lock=True)
    layout.name = body.name
    layout.updated_at = utcnow()
    session.add(layout)
    session.commit()
    return layout_read(session, layout)


@router.delete("/{layout_id}", status_code=204)
def delete_layout(layout_id: UUID, user: User = Depends(current_user), session: Session = Depends(get_session)):
    layout = owned_layout(session, layout_id, user, lock=True)
    session.delete(layout)
    session.commit()
