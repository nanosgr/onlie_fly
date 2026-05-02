from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlmodel import Session
from typing import List, Optional
from cachetools import TTLCache
from app.db.database import get_db
from app.core.security import verify_token
from app.services.crud import user_service
from app.models.models import User

security = HTTPBearer()

# Cache de permisos: key=(username, token_version), TTL=60s
_permissions_cache: TTLCache = TTLCache(maxsize=512, ttl=60)


def get_user_permissions(user: User) -> set:
    """Retorna el conjunto de permisos efectivos del usuario. Superusers obtienen wildcard."""
    if user.is_superuser:
        return {"*:*"}
    return {
        f"{permission.resource}:{permission.action}"
        for role in user.roles
        if role.is_active
        for permission in role.permissions
        if permission.is_active
    }


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    payload = verify_token(credentials.credentials)
    if payload is None:
        raise credentials_exception

    cache_key = (payload["sub"], payload["token_version"])
    cached = _permissions_cache.get(cache_key)

    if cached is not None:
        user_id, _ = cached
        user = user_service.get_user(db, user_id)
        if user is None:
            raise credentials_exception
        return user

    user = user_service.get_user_by_username(db, username=payload["sub"])
    if user is None:
        raise credentials_exception

    if user.token_version != payload["token_version"]:
        raise credentials_exception

    permissions = get_user_permissions(user)
    _permissions_cache[cache_key] = (user.id, permissions)

    return user


def get_current_active_user(current_user: User = Depends(get_current_user)) -> User:
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user


def require_permissions(required_permissions: List[str]):
    def permission_checker(current_user: User = Depends(get_current_active_user)):
        cache_key = (current_user.username, current_user.token_version)
        cached = _permissions_cache.get(cache_key)
        user_permissions = cached[1] if cached else get_user_permissions(current_user)

        for required in required_permissions:
            if "*:*" not in user_permissions and required not in user_permissions:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Permission denied. Required: {required}",
                )
        return current_user

    return permission_checker


def check_owner_or_permission(resource_owner_id: Optional[int], current_user: User, permission: str) -> bool:
    """Retorna True si el usuario es el dueño del recurso O tiene el permiso especificado."""
    cache_key = (current_user.username, current_user.token_version)
    cached = _permissions_cache.get(cache_key)
    user_permissions = cached[1] if cached else get_user_permissions(current_user)
    if "*:*" in user_permissions or permission in user_permissions:
        return True
    return resource_owner_id is not None and current_user.id == resource_owner_id


def require_owner_or_permission(permission: str):
    """
    Dependencia ABAC: inyecta current_user validado para endpoints donde el acceso
    se permite si el usuario es dueño del recurso O tiene el permiso indicado.

    Uso en el endpoint:
        current_user = Depends(require_owner_or_permission("items:read"))
        if not check_owner_or_permission(item.owner_id, current_user, "items:read"):
            raise HTTPException(403)
    """
    def dependency(current_user: User = Depends(get_current_active_user)) -> User:
        return current_user
    return dependency


def require_user_read():
    return require_permissions(["users:read"])

def require_user_create():
    return require_permissions(["users:create"])

def require_user_update():
    return require_permissions(["users:update"])

def require_user_delete():
    return require_permissions(["users:delete"])

def require_role_read():
    return require_permissions(["roles:read"])

def require_role_create():
    return require_permissions(["roles:create"])

def require_role_update():
    return require_permissions(["roles:update"])

def require_role_delete():
    return require_permissions(["roles:delete"])

def require_permission_read():
    return require_permissions(["permissions:read"])

def require_permission_create():
    return require_permissions(["permissions:create"])

def require_permission_update():
    return require_permissions(["permissions:update"])

def require_permission_delete():
    return require_permissions(["permissions:delete"])


# ---------------------------------------------------------------------------
# ABAC: dependencias del dominio aeronáutico
# ---------------------------------------------------------------------------

def get_current_piloto(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    from app.services.crud import piloto_service  # lazy para evitar importación circular
    piloto = piloto_service.get_piloto_by_user_id(db, current_user.id)
    if piloto is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="El usuario no tiene perfil de piloto asociado.",
        )
    return piloto


def require_piloto_activo():
    from datetime import date
    def checker(current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
        from app.services.crud import piloto_service
        piloto = piloto_service.get_piloto_by_user_id(db, current_user.id)
        if piloto is None:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="El usuario no tiene perfil de piloto asociado.")
        if piloto.psicofisico_vence < date.today():
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Psicofísico vencido. No puede realizar operaciones.")
        return piloto
    return checker


def is_piloto_role(current_user: User) -> bool:
    """Retorna True si el usuario tiene el rol Piloto pero no tiene planificaciones:read global."""
    cache_key = (current_user.username, current_user.token_version)
    cached = _permissions_cache.get(cache_key)
    user_permissions = cached[1] if cached else get_user_permissions(current_user)
    return "*:*" not in user_permissions and "planificaciones:read" not in user_permissions


# ---------------------------------------------------------------------------
# Helpers de permisos — dominio aeronáutico
# ---------------------------------------------------------------------------

def require_aeronave_read():
    return require_permissions(["aeronaves:read"])

def require_aeronave_create():
    return require_permissions(["aeronaves:create"])

def require_aeronave_update():
    return require_permissions(["aeronaves:update"])

def require_aeronave_delete():
    return require_permissions(["aeronaves:delete"])

def require_piloto_read():
    return require_permissions(["pilotos:read"])

def require_piloto_create():
    return require_permissions(["pilotos:create"])

def require_piloto_update():
    return require_permissions(["pilotos:update"])

def require_piloto_delete():
    return require_permissions(["pilotos:delete"])

def require_habilitacion_read():
    return require_permissions(["habilitaciones:read"])

def require_habilitacion_create():
    return require_permissions(["habilitaciones:create"])

def require_habilitacion_update():
    return require_permissions(["habilitaciones:update"])

def require_habilitacion_delete():
    return require_permissions(["habilitaciones:delete"])

def require_tipo_operacion_read():
    return require_permissions(["tipos_operacion:read"])

def require_tipo_operacion_create():
    return require_permissions(["tipos_operacion:create"])

def require_tipo_operacion_update():
    return require_permissions(["tipos_operacion:update"])

def require_tipo_operacion_delete():
    return require_permissions(["tipos_operacion:delete"])

def require_planificacion_read():
    return require_permissions(["planificaciones:read"])

def require_planificacion_create():
    return require_permissions(["planificaciones:create"])

def require_planificacion_update():
    return require_permissions(["planificaciones:update"])

def require_planificacion_delete():
    return require_permissions(["planificaciones:delete"])

def require_registro_vuelo_read():
    return require_permissions(["registros_vuelo:read"])

def require_registro_vuelo_create():
    return require_permissions(["registros_vuelo:create"])

def require_registro_vuelo_update():
    return require_permissions(["registros_vuelo:update"])
