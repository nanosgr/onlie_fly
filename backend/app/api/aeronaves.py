from math import ceil
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session
from app.db.database import get_db
from app.services.crud import aeronave_service
from app.models.models import User, AeronaveCreate, AeronaveRead, AeronaveUpdate
from app.schemas.schemas import PaginatedResponse
from app.core.deps import (
    require_aeronave_read,
    require_aeronave_create,
    require_aeronave_update,
    require_aeronave_delete,
)

router = APIRouter()


@router.get("/alertas", response_model=List[AeronaveRead])
def read_aeronaves_con_alerta(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_aeronave_read()),
):
    aeronaves = aeronave_service.get_aeronaves_con_alerta(db)
    return [aeronave_service.to_read(a) for a in aeronaves]


@router.get("/", response_model=PaginatedResponse[AeronaveRead])
def read_aeronaves(
    page: int = Query(default=1, ge=1),
    size: int = Query(default=50, ge=1, le=200),
    search: Optional[str] = Query(default=None),
    is_active: Optional[bool] = Query(default=None),
    tipo: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_aeronave_read()),
):
    skip = (page - 1) * size
    total = aeronave_service.count_aeronaves(db, search=search, is_active=is_active, tipo=tipo)
    items = aeronave_service.get_aeronaves(db, skip=skip, limit=size, search=search, is_active=is_active, tipo=tipo)
    return PaginatedResponse(
        items=[aeronave_service.to_read(a) for a in items],
        total=total,
        page=page,
        size=size,
        pages=ceil(total / size) if total else 0,
    )


@router.post("/", response_model=AeronaveRead, status_code=201)
def create_aeronave(
    data: AeronaveCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_aeronave_create()),
):
    if aeronave_service.get_aeronave_by_matricula(db, data.matricula):
        raise HTTPException(status_code=409, detail="Ya existe una aeronave con esa matrícula.")
    obj = aeronave_service.create_aeronave(db, data)
    return aeronave_service.to_read(obj)


@router.get("/{aeronave_id}", response_model=AeronaveRead)
def read_aeronave(
    aeronave_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_aeronave_read()),
):
    obj = aeronave_service.get_aeronave(db, aeronave_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Aeronave no encontrada.")
    return aeronave_service.to_read(obj)


@router.put("/{aeronave_id}", response_model=AeronaveRead)
def update_aeronave(
    aeronave_id: int,
    data: AeronaveUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_aeronave_update()),
):
    obj = aeronave_service.update_aeronave(db, aeronave_id, data)
    if not obj:
        raise HTTPException(status_code=404, detail="Aeronave no encontrada.")
    return aeronave_service.to_read(obj)


@router.delete("/{aeronave_id}", status_code=204)
def delete_aeronave(
    aeronave_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_aeronave_delete()),
):
    if not aeronave_service.delete_aeronave(db, aeronave_id):
        raise HTTPException(status_code=404, detail="Aeronave no encontrada.")
