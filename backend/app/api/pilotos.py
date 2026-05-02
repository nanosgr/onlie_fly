from math import ceil
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session
from app.db.database import get_db
from app.services.crud import piloto_service
from app.models.models import User, Piloto, PilotoCreate, PilotoRead, PilotoUpdate
from app.schemas.schemas import PaginatedResponse
from app.core.deps import (
    get_current_active_user,
    get_current_piloto,
    check_owner_or_permission,
    require_piloto_read,
    require_piloto_create,
    require_piloto_update,
    require_piloto_delete,
)

router = APIRouter()


@router.get("/me", response_model=PilotoRead)
def read_my_piloto(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    piloto = piloto_service.get_piloto_by_user_id(db, current_user.id)
    if not piloto:
        raise HTTPException(status_code=404, detail="No tiene perfil de piloto asociado.")
    return piloto_service.to_read(piloto)


@router.get("/", response_model=PaginatedResponse[PilotoRead])
def read_pilotos(
    page: int = Query(default=1, ge=1),
    size: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_piloto_read()),
):
    skip = (page - 1) * size
    total = piloto_service.count_pilotos(db)
    items = piloto_service.get_pilotos(db, skip=skip, limit=size)
    return PaginatedResponse(
        items=[piloto_service.to_read(p) for p in items],
        total=total,
        page=page,
        size=size,
        pages=ceil(total / size) if total else 0,
    )


@router.post("/", response_model=PilotoRead, status_code=201)
def create_piloto(
    data: PilotoCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_piloto_create()),
):
    if piloto_service.get_piloto_by_user_id(db, data.user_id):
        raise HTTPException(status_code=409, detail="El usuario ya tiene un perfil de piloto.")
    obj = piloto_service.create_piloto(db, data)
    return piloto_service.to_read(obj)


@router.get("/{piloto_id}", response_model=PilotoRead)
def read_piloto(
    piloto_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    piloto = piloto_service.get_piloto(db, piloto_id)
    if not piloto:
        raise HTTPException(status_code=404, detail="Piloto no encontrado.")
    if not check_owner_or_permission(piloto.user_id, current_user, "pilotos:read"):
        raise HTTPException(status_code=403, detail="No tiene permiso para ver este perfil.")
    return piloto_service.to_read(piloto)


@router.put("/{piloto_id}", response_model=PilotoRead)
def update_piloto(
    piloto_id: int,
    data: PilotoUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_piloto_update()),
):
    obj = piloto_service.update_piloto(db, piloto_id, data)
    if not obj:
        raise HTTPException(status_code=404, detail="Piloto no encontrado.")
    return piloto_service.to_read(obj)


@router.delete("/{piloto_id}", status_code=204)
def delete_piloto(
    piloto_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_piloto_delete()),
):
    if not piloto_service.delete_piloto(db, piloto_id):
        raise HTTPException(status_code=404, detail="Piloto no encontrado.")
