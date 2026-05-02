from math import ceil
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session
from app.db.database import get_db
from app.services.crud import registro_vuelo_service, piloto_service
from app.models.models import User, Piloto, RegistroVueloCreate, RegistroVueloRead, RegistroVueloUpdate
from app.schemas.schemas import PaginatedResponse
from app.core.deps import (
    get_current_active_user,
    is_piloto_role,
    require_registro_vuelo_create,
    require_registro_vuelo_update,
)

router = APIRouter()


def _resolver_piloto_y_filtro(db: Session, current_user: User) -> tuple[Optional[int], Optional[Piloto]]:
    """Retorna (piloto_id_filtro, piloto_obj). piloto_id_filtro es None si el usuario ve todo."""
    if is_piloto_role(current_user):
        piloto = piloto_service.get_piloto_by_user_id(db, current_user.id)
        if not piloto:
            raise HTTPException(status_code=403, detail="No tiene perfil de piloto asociado.")
        return piloto.id, piloto
    return None, None


@router.get("/", response_model=PaginatedResponse[RegistroVueloRead])
def read_registros_vuelo(
    page: int = Query(default=1, ge=1),
    size: int = Query(default=50, ge=1, le=200),
    aeronave_id: Optional[int] = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    piloto_id_filtro, _ = _resolver_piloto_y_filtro(db, current_user)
    skip = (page - 1) * size
    total = registro_vuelo_service.count_registros(db, piloto_id=piloto_id_filtro, aeronave_id=aeronave_id)
    items = registro_vuelo_service.get_registros(
        db, skip=skip, limit=size, piloto_id=piloto_id_filtro, aeronave_id=aeronave_id
    )
    return PaginatedResponse(
        items=[RegistroVueloRead.model_validate(r) for r in items],
        total=total,
        page=page,
        size=size,
        pages=ceil(total / size) if total else 0,
    )


@router.post("/", response_model=RegistroVueloRead, status_code=201)
def create_registro_vuelo(
    data: RegistroVueloCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_registro_vuelo_create()),
):
    piloto = piloto_service.get_piloto_by_user_id(db, current_user.id)
    if not piloto:
        raise HTTPException(status_code=403, detail="No tiene perfil de piloto asociado.")
    obj = registro_vuelo_service.create_registro(db, data, current_piloto=piloto)
    return RegistroVueloRead.model_validate(obj)


@router.get("/{registro_id}", response_model=RegistroVueloRead)
def read_registro_vuelo(
    registro_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    obj = registro_vuelo_service.get_registro(db, registro_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Registro de vuelo no encontrado.")
    if is_piloto_role(current_user):
        piloto = piloto_service.get_piloto_by_user_id(db, current_user.id)
        if not piloto or obj.piloto_id != piloto.id:
            raise HTTPException(status_code=403, detail="No tiene acceso a este registro de vuelo.")
    return RegistroVueloRead.model_validate(obj)


@router.put("/{registro_id}", response_model=RegistroVueloRead)
def update_registro_vuelo(
    registro_id: int,
    data: RegistroVueloUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_registro_vuelo_update()),
):
    piloto = piloto_service.get_piloto_by_user_id(db, current_user.id)
    if not piloto:
        raise HTTPException(status_code=403, detail="No tiene perfil de piloto asociado.")
    obj = registro_vuelo_service.update_registro(db, registro_id, data, current_piloto=piloto)
    if not obj:
        raise HTTPException(status_code=404, detail="Registro de vuelo no encontrado.")
    return RegistroVueloRead.model_validate(obj)
