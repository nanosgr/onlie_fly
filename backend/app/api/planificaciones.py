from math import ceil
from datetime import date
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session
from app.db.database import get_db
from app.services.crud import planificacion_service, piloto_service
from app.models.models import User, PlanificacionCreate, PlanificacionRead, PlanificacionUpdate
from app.schemas.schemas import PaginatedResponse
from app.core.deps import (
    get_current_active_user,
    is_piloto_role,
    require_planificacion_create,
    require_planificacion_update,
    require_planificacion_delete,
)

router = APIRouter()


def _get_piloto_id_filtro(db: Session, current_user: User) -> Optional[int]:
    """Retorna piloto_id para filtrar si el usuario es piloto (sin acceso global), o None si ve todo."""
    if is_piloto_role(current_user):
        piloto = piloto_service.get_piloto_by_user_id(db, current_user.id)
        if not piloto:
            raise HTTPException(status_code=403, detail="No tiene perfil de piloto asociado.")
        return piloto.id
    return None


@router.get("/", response_model=PaginatedResponse[PlanificacionRead])
def read_planificaciones(
    page: int = Query(default=1, ge=1),
    size: int = Query(default=50, ge=1, le=200),
    fecha_desde: Optional[date] = Query(default=None),
    fecha_hasta: Optional[date] = Query(default=None),
    status: Optional[str] = Query(default=None),
    aeronave_id: Optional[int] = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    piloto_id = _get_piloto_id_filtro(db, current_user)
    skip = (page - 1) * size
    total = planificacion_service.count_planificaciones(
        db, piloto_id=piloto_id, fecha_desde=fecha_desde, fecha_hasta=fecha_hasta, status=status
    )
    items = planificacion_service.get_planificaciones(
        db, skip=skip, limit=size, piloto_id=piloto_id,
        fecha_desde=fecha_desde, fecha_hasta=fecha_hasta, status=status, aeronave_id=aeronave_id,
    )
    return PaginatedResponse(
        items=[PlanificacionRead.model_validate(p) for p in items],
        total=total,
        page=page,
        size=size,
        pages=ceil(total / size) if total else 0,
    )


@router.post("/", response_model=PlanificacionRead, status_code=201)
def create_planificacion(
    data: PlanificacionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_planificacion_create()),
):
    obj = planificacion_service.create_planificacion(db, data, created_by_id=current_user.id)
    return PlanificacionRead.model_validate(obj)


@router.get("/{planificacion_id}", response_model=PlanificacionRead)
def read_planificacion(
    planificacion_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    obj = planificacion_service.get_planificacion(db, planificacion_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Planificación no encontrada.")
    if is_piloto_role(current_user):
        piloto = piloto_service.get_piloto_by_user_id(db, current_user.id)
        if not piloto or obj.piloto_id != piloto.id:
            raise HTTPException(status_code=403, detail="No tiene acceso a esta planificación.")
    return PlanificacionRead.model_validate(obj)


@router.put("/{planificacion_id}", response_model=PlanificacionRead)
def update_planificacion(
    planificacion_id: int,
    data: PlanificacionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_planificacion_update()),
):
    obj = planificacion_service.get_planificacion(db, planificacion_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Planificación no encontrada.")
    updated = planificacion_service.update_planificacion(db, planificacion_id, data)
    return PlanificacionRead.model_validate(updated)


@router.patch("/{planificacion_id}/cancelar", response_model=PlanificacionRead)
def cancelar_planificacion(
    planificacion_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_planificacion_update()),
):
    obj = planificacion_service.cancelar_planificacion(db, planificacion_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Planificación no encontrada.")
    return PlanificacionRead.model_validate(obj)


@router.delete("/{planificacion_id}", status_code=204)
def delete_planificacion(
    planificacion_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_planificacion_delete()),
):
    obj = planificacion_service.get_planificacion(db, planificacion_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Planificación no encontrada.")
    from sqlmodel import Session as S
    db.delete(obj)
    db.commit()
