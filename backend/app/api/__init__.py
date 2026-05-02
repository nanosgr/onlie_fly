from fastapi import APIRouter
from app.api import (
    auth, users, roles, permissions, audit, password_reset,
    habilitaciones, aeronaves, tipos_operacion, pilotos,
    planificaciones, registros_vuelo,
)

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["authentication"])
api_router.include_router(password_reset.router, prefix="/auth", tags=["authentication"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(roles.router, prefix="/roles", tags=["roles"])
api_router.include_router(permissions.router, prefix="/permissions", tags=["permissions"])
api_router.include_router(audit.router, prefix="/audit", tags=["audit"])
api_router.include_router(habilitaciones.router, prefix="/habilitaciones", tags=["habilitaciones"])
api_router.include_router(aeronaves.router, prefix="/aeronaves", tags=["aeronaves"])
api_router.include_router(tipos_operacion.router, prefix="/tipos-operacion", tags=["tipos_operacion"])
api_router.include_router(pilotos.router, prefix="/pilotos", tags=["pilotos"])
api_router.include_router(planificaciones.router, prefix="/planificaciones", tags=["planificaciones"])
api_router.include_router(registros_vuelo.router, prefix="/registros-vuelo", tags=["registros_vuelo"])
