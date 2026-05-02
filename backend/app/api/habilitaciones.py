from math import ceil
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session
from app.db.database import get_db
from app.services.crud import habilitacion_tipo_service
from app.models.models import User, HabilitacionTipoCreate, HabilitacionTipoRead, HabilitacionTipoUpdate
from app.schemas.schemas import PaginatedResponse
from app.core.deps import (
    require_habilitacion_read,
    require_habilitacion_create,
    require_habilitacion_update,
    require_habilitacion_delete,
)

router = APIRouter()


@router.get("/", response_model=PaginatedResponse[HabilitacionTipoRead])
def read_habilitaciones(
    page: int = Query(default=1, ge=1),
    size: int = Query(default=100, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_habilitacion_read()),
):
    skip = (page - 1) * size
    total = habilitacion_tipo_service.count_habilitaciones(db)
    items = habilitacion_tipo_service.get_habilitaciones(db, skip=skip, limit=size)
    return PaginatedResponse(
        items=[HabilitacionTipoRead.model_validate(h) for h in items],
        total=total,
        page=page,
        size=size,
        pages=ceil(total / size) if total else 0,
    )


@router.post("/", response_model=HabilitacionTipoRead, status_code=201)
def create_habilitacion(
    data: HabilitacionTipoCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_habilitacion_create()),
):
    existing = habilitacion_tipo_service.get_habilitacion_by_nombre(db, data.nombre)
    if existing:
        raise HTTPException(status_code=409, detail="Ya existe una habilitación con ese nombre.")
    obj = habilitacion_tipo_service.create_habilitacion(db, data)
    return HabilitacionTipoRead.model_validate(obj)


@router.get("/{habilitacion_id}", response_model=HabilitacionTipoRead)
def read_habilitacion(
    habilitacion_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_habilitacion_read()),
):
    obj = habilitacion_tipo_service.get_habilitacion(db, habilitacion_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Habilitación no encontrada.")
    return HabilitacionTipoRead.model_validate(obj)


@router.put("/{habilitacion_id}", response_model=HabilitacionTipoRead)
def update_habilitacion(
    habilitacion_id: int,
    data: HabilitacionTipoUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_habilitacion_update()),
):
    obj = habilitacion_tipo_service.update_habilitacion(db, habilitacion_id, data)
    if not obj:
        raise HTTPException(status_code=404, detail="Habilitación no encontrada.")
    return HabilitacionTipoRead.model_validate(obj)


@router.delete("/{habilitacion_id}", status_code=204)
def delete_habilitacion(
    habilitacion_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_habilitacion_delete()),
):
    if not habilitacion_tipo_service.delete_habilitacion(db, habilitacion_id):
        raise HTTPException(status_code=404, detail="Habilitación no encontrada.")
