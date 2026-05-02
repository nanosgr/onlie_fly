from math import ceil
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session
from app.db.database import get_db
from app.services.crud import tipo_operacion_service
from app.models.models import User, TipoOperacionCreate, TipoOperacionRead, TipoOperacionUpdate
from app.schemas.schemas import PaginatedResponse
from app.core.deps import (
    require_tipo_operacion_read,
    require_tipo_operacion_create,
    require_tipo_operacion_update,
    require_tipo_operacion_delete,
)

router = APIRouter()


@router.get("/", response_model=PaginatedResponse[TipoOperacionRead])
def read_tipos_operacion(
    page: int = Query(default=1, ge=1),
    size: int = Query(default=50, ge=1, le=200),
    is_active: Optional[bool] = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_tipo_operacion_read()),
):
    skip = (page - 1) * size
    total = tipo_operacion_service.count_tipos(db, is_active=is_active)
    items = tipo_operacion_service.get_tipos_operacion(db, skip=skip, limit=size, is_active=is_active)
    return PaginatedResponse(
        items=[TipoOperacionRead.model_validate(t) for t in items],
        total=total,
        page=page,
        size=size,
        pages=ceil(total / size) if total else 0,
    )


@router.post("/", response_model=TipoOperacionRead, status_code=201)
def create_tipo_operacion(
    data: TipoOperacionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_tipo_operacion_create()),
):
    if tipo_operacion_service.get_tipo_by_nombre(db, data.nombre):
        raise HTTPException(status_code=409, detail="Ya existe un tipo de operación con ese nombre.")
    obj = tipo_operacion_service.create_tipo_operacion(db, data)
    return TipoOperacionRead.model_validate(obj)


@router.get("/{tipo_id}", response_model=TipoOperacionRead)
def read_tipo_operacion(
    tipo_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_tipo_operacion_read()),
):
    obj = tipo_operacion_service.get_tipo_operacion(db, tipo_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Tipo de operación no encontrado.")
    return TipoOperacionRead.model_validate(obj)


@router.put("/{tipo_id}", response_model=TipoOperacionRead)
def update_tipo_operacion(
    tipo_id: int,
    data: TipoOperacionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_tipo_operacion_update()),
):
    obj = tipo_operacion_service.update_tipo_operacion(db, tipo_id, data)
    if not obj:
        raise HTTPException(status_code=404, detail="Tipo de operación no encontrado.")
    return TipoOperacionRead.model_validate(obj)


@router.delete("/{tipo_id}", status_code=204)
def delete_tipo_operacion(
    tipo_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_tipo_operacion_delete()),
):
    if not tipo_operacion_service.delete_tipo_operacion(db, tipo_id):
        raise HTTPException(status_code=404, detail="Tipo de operación no encontrado.")
