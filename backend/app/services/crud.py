from datetime import date as date_cls, datetime as dt_cls, timedelta, time as time_cls
from decimal import Decimal, ROUND_HALF_UP
from sqlmodel import Session, select, func, or_
from sqlalchemy import select as sa_select
from sqlalchemy.orm import selectinload
from typing import List, Optional
from fastapi import HTTPException
from app.models.models import (
    User, Role, Permission, UserCreate, UserUpdate, RoleCreate, RoleUpdate,
    PermissionCreate, PermissionUpdate,
    HabilitacionTipo, HabilitacionTipoCreate, HabilitacionTipoRead, HabilitacionTipoUpdate,
    Aeronave, AeronaveCreate, AeronaveRead, AeronaveUpdate,
    Piloto, PilotoCreate, PilotoRead, PilotoUpdate,
    TipoOperacion, TipoOperacionCreate, TipoOperacionRead, TipoOperacionUpdate,
    Planificacion, PlanificacionCreate, PlanificacionUpdate, PlanificacionStatusEnum,
    RegistroVuelo, RegistroVueloCreate, RegistroVueloUpdate,
)
from app.core.security import get_password_hash, verify_password


class UserService:
    def get_user(self, db: Session, user_id: int) -> Optional[User]:
        stmt = sa_select(User).options(selectinload(User.roles).selectinload(Role.permissions)).where(User.id == user_id)
        return db.execute(stmt).scalars().first()

    def get_user_by_username(self, db: Session, username: str) -> Optional[User]:
        return db.exec(select(User).where(User.username == username)).first()

    def get_user_by_email(self, db: Session, email: str) -> Optional[User]:
        return db.exec(select(User).where(User.email == email)).first()

    def get_users(self, db: Session, skip: int = 0, limit: int = 100, search: Optional[str] = None, is_active: Optional[bool] = None) -> List[User]:
        stmt = sa_select(User).options(selectinload(User.roles).selectinload(Role.permissions))
        if search:
            stmt = stmt.where(or_(
                User.username.ilike(f"%{search}%"),
                User.email.ilike(f"%{search}%"),
                User.full_name.ilike(f"%{search}%"),
            ))
        if is_active is not None:
            stmt = stmt.where(User.is_active == is_active)
        return list(db.execute(stmt.offset(skip).limit(limit)).scalars().unique().all())

    def count_users(self, db: Session, search: Optional[str] = None, is_active: Optional[bool] = None) -> int:
        query = select(func.count(User.id))
        if search:
            query = query.where(or_(
                User.username.ilike(f"%{search}%"),
                User.email.ilike(f"%{search}%"),
                User.full_name.ilike(f"%{search}%"),
            ))
        if is_active is not None:
            query = query.where(User.is_active == is_active)
        return db.exec(query).one()

    def create_user(self, db: Session, user: UserCreate, created_by: Optional[int] = None) -> User:
        db_user = User(
            username=user.username,
            email=user.email,
            hashed_password=get_password_hash(user.password),
            full_name=user.full_name,
            is_active=user.is_active,
            created_by=created_by,
        )
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        return db_user

    def update_user(self, db: Session, user_id: int, user_update: UserUpdate) -> Optional[User]:
        db_user = self.get_user(db, user_id)
        if db_user:
            update_data = user_update.model_dump(exclude_unset=True)
            if "password" in update_data:
                update_data["hashed_password"] = get_password_hash(update_data.pop("password"))
            if update_data.get("is_active") is False:
                db_user.token_version += 1
            for field, value in update_data.items():
                setattr(db_user, field, value)
            db.commit()
            db.refresh(db_user)
        return db_user

    def delete_user(self, db: Session, user_id: int) -> bool:
        db_user = self.get_user(db, user_id)
        if db_user:
            db.delete(db_user)
            db.commit()
            return True
        return False

    def authenticate_user(self, db: Session, username: str, password: str) -> Optional[User]:
        user = self.get_user_by_username(db, username)
        if not user:
            return None
        if not verify_password(password, user.hashed_password):
            return None
        return user

    def change_password(self, db: Session, user_id: int, current_password: str, new_password: str) -> bool:
        db_user = self.get_user(db, user_id)
        if not db_user or not verify_password(current_password, db_user.hashed_password):
            return False
        db_user.hashed_password = get_password_hash(new_password)
        db.commit()
        return True

    def increment_token_version(self, db: Session, user_id: int) -> None:
        db_user = db.get(User, user_id)
        if db_user:
            db_user.token_version += 1
            db.commit()

    def assign_roles_to_user(self, db: Session, user_id: int, role_ids: List[int]) -> Optional[User]:
        db_user = self.get_user(db, user_id)
        if db_user:
            roles = db.exec(select(Role).where(Role.id.in_(role_ids))).all()
            db_user.roles = roles
            db_user.token_version += 1
            db.commit()
        return self.get_user(db, user_id)


class RoleService:
    def get_role(self, db: Session, role_id: int) -> Optional[Role]:
        stmt = sa_select(Role).options(selectinload(Role.permissions)).where(Role.id == role_id)
        return db.execute(stmt).scalars().first()

    def get_role_by_name(self, db: Session, name: str) -> Optional[Role]:
        return db.exec(select(Role).where(Role.name == name)).first()

    def get_roles(self, db: Session, skip: int = 0, limit: int = 100, search: Optional[str] = None, is_active: Optional[bool] = None) -> List[Role]:
        stmt = sa_select(Role).options(selectinload(Role.permissions))
        if search:
            stmt = stmt.where(or_(
                Role.name.ilike(f"%{search}%"),
                Role.description.ilike(f"%{search}%"),
            ))
        if is_active is not None:
            stmt = stmt.where(Role.is_active == is_active)
        return list(db.execute(stmt.offset(skip).limit(limit)).scalars().unique().all())

    def count_roles(self, db: Session, search: Optional[str] = None, is_active: Optional[bool] = None) -> int:
        query = select(func.count(Role.id))
        if search:
            query = query.where(or_(
                Role.name.ilike(f"%{search}%"),
                Role.description.ilike(f"%{search}%"),
            ))
        if is_active is not None:
            query = query.where(Role.is_active == is_active)
        return db.exec(query).one()

    def create_role(self, db: Session, role: RoleCreate) -> Role:
        db_role = Role(**role.model_dump())
        db.add(db_role)
        db.commit()
        db.refresh(db_role)
        return db_role

    def update_role(self, db: Session, role_id: int, role_update: RoleUpdate) -> Optional[Role]:
        db_role = self.get_role(db, role_id)
        if db_role:
            update_data = role_update.model_dump(exclude_unset=True)
            for field, value in update_data.items():
                setattr(db_role, field, value)
            db.commit()
            db.refresh(db_role)
        return db_role

    def delete_role(self, db: Session, role_id: int) -> bool:
        db_role = self.get_role(db, role_id)
        if db_role:
            db.delete(db_role)
            db.commit()
            return True
        return False

    def assign_permissions_to_role(self, db: Session, role_id: int, permission_ids: List[int]) -> Optional[Role]:
        db_role = self.get_role(db, role_id)
        if db_role:
            permissions = db.exec(select(Permission).where(Permission.id.in_(permission_ids))).all()
            db_role.permissions = permissions
            db.commit()
        return self.get_role(db, role_id)


class PermissionService:
    def get_permission(self, db: Session, permission_id: int) -> Optional[Permission]:
        return db.get(Permission, permission_id)

    def get_permission_by_name(self, db: Session, name: str) -> Optional[Permission]:
        return db.exec(select(Permission).where(Permission.name == name)).first()

    def get_permissions(self, db: Session, skip: int = 0, limit: int = 100, search: Optional[str] = None, is_active: Optional[bool] = None, resource: Optional[str] = None, action: Optional[str] = None) -> List[Permission]:
        query = select(Permission)
        if search:
            query = query.where(or_(
                Permission.name.ilike(f"%{search}%"),
                Permission.description.ilike(f"%{search}%"),
            ))
        if is_active is not None:
            query = query.where(Permission.is_active == is_active)
        if resource:
            query = query.where(Permission.resource == resource)
        if action:
            query = query.where(Permission.action == action)
        return db.exec(query.offset(skip).limit(limit)).all()

    def count_permissions(self, db: Session, search: Optional[str] = None, is_active: Optional[bool] = None, resource: Optional[str] = None, action: Optional[str] = None) -> int:
        query = select(func.count(Permission.id))
        if search:
            query = query.where(or_(
                Permission.name.ilike(f"%{search}%"),
                Permission.description.ilike(f"%{search}%"),
            ))
        if is_active is not None:
            query = query.where(Permission.is_active == is_active)
        if resource:
            query = query.where(Permission.resource == resource)
        if action:
            query = query.where(Permission.action == action)
        return db.exec(query).one()

    def create_permission(self, db: Session, permission: PermissionCreate) -> Permission:
        db_permission = Permission(**permission.model_dump())
        db.add(db_permission)
        db.commit()
        db.refresh(db_permission)
        return db_permission

    def update_permission(self, db: Session, permission_id: int, permission_update: PermissionUpdate) -> Optional[Permission]:
        db_permission = self.get_permission(db, permission_id)
        if db_permission:
            update_data = permission_update.model_dump(exclude_unset=True)
            for field, value in update_data.items():
                setattr(db_permission, field, value)
            db.commit()
            db.refresh(db_permission)
        return db_permission

    def delete_permission(self, db: Session, permission_id: int) -> bool:
        db_permission = self.get_permission(db, permission_id)
        if db_permission:
            db.delete(db_permission)
            db.commit()
            return True
        return False


user_service = UserService()
role_service = RoleService()
permission_service = PermissionService()


# ---------------------------------------------------------------------------
# HabilitacionTipoService
# ---------------------------------------------------------------------------

class HabilitacionTipoService:
    def get_habilitacion(self, db: Session, habilitacion_id: int) -> Optional[HabilitacionTipo]:
        return db.get(HabilitacionTipo, habilitacion_id)

    def get_habilitacion_by_nombre(self, db: Session, nombre: str) -> Optional[HabilitacionTipo]:
        return db.exec(select(HabilitacionTipo).where(HabilitacionTipo.nombre == nombre)).first()

    def get_habilitaciones(self, db: Session, skip: int = 0, limit: int = 100) -> List[HabilitacionTipo]:
        return list(db.exec(select(HabilitacionTipo).offset(skip).limit(limit)).all())

    def count_habilitaciones(self, db: Session) -> int:
        return db.exec(select(func.count(HabilitacionTipo.id))).one()

    def create_habilitacion(self, db: Session, data: HabilitacionTipoCreate) -> HabilitacionTipo:
        obj = HabilitacionTipo(**data.model_dump())
        db.add(obj)
        db.commit()
        db.refresh(obj)
        return obj

    def update_habilitacion(self, db: Session, habilitacion_id: int, data: HabilitacionTipoUpdate) -> Optional[HabilitacionTipo]:
        obj = self.get_habilitacion(db, habilitacion_id)
        if obj:
            for field, value in data.model_dump(exclude_unset=True).items():
                setattr(obj, field, value)
            db.commit()
            db.refresh(obj)
        return obj

    def delete_habilitacion(self, db: Session, habilitacion_id: int) -> bool:
        obj = self.get_habilitacion(db, habilitacion_id)
        if obj:
            db.delete(obj)
            db.commit()
            return True
        return False


# ---------------------------------------------------------------------------
# AeronaveService
# ---------------------------------------------------------------------------

class AeronaveService:
    def get_aeronave(self, db: Session, aeronave_id: int) -> Optional[Aeronave]:
        return db.get(Aeronave, aeronave_id)

    def get_aeronave_by_matricula(self, db: Session, matricula: str) -> Optional[Aeronave]:
        return db.exec(select(Aeronave).where(Aeronave.matricula == matricula)).first()

    def get_aeronaves(self, db: Session, skip: int = 0, limit: int = 100,
                      search: Optional[str] = None, is_active: Optional[bool] = None,
                      tipo: Optional[str] = None) -> List[Aeronave]:
        stmt = sa_select(Aeronave)
        if search:
            stmt = stmt.where(or_(
                Aeronave.matricula.ilike(f"%{search}%"),
                Aeronave.modelo.ilike(f"%{search}%"),
                Aeronave.fabricante.ilike(f"%{search}%"),
            ))
        if is_active is not None:
            stmt = stmt.where(Aeronave.is_active == is_active)
        if tipo:
            stmt = stmt.where(Aeronave.tipo == tipo)
        return list(db.execute(stmt.offset(skip).limit(limit)).scalars().all())

    def count_aeronaves(self, db: Session, search: Optional[str] = None,
                        is_active: Optional[bool] = None, tipo: Optional[str] = None) -> int:
        query = select(func.count(Aeronave.id))
        if search:
            query = query.where(or_(
                Aeronave.matricula.ilike(f"%{search}%"),
                Aeronave.modelo.ilike(f"%{search}%"),
                Aeronave.fabricante.ilike(f"%{search}%"),
            ))
        if is_active is not None:
            query = query.where(Aeronave.is_active == is_active)
        if tipo:
            query = query.where(Aeronave.tipo == tipo)
        return db.exec(query).one()

    def create_aeronave(self, db: Session, data: AeronaveCreate) -> Aeronave:
        obj = Aeronave(**data.model_dump())
        db.add(obj)
        db.commit()
        db.refresh(obj)
        return obj

    def update_aeronave(self, db: Session, aeronave_id: int, data: AeronaveUpdate) -> Optional[Aeronave]:
        obj = self.get_aeronave(db, aeronave_id)
        if obj:
            for field, value in data.model_dump(exclude_unset=True).items():
                setattr(obj, field, value)
            db.commit()
            db.refresh(obj)
        return obj

    def delete_aeronave(self, db: Session, aeronave_id: int) -> bool:
        obj = self.get_aeronave(db, aeronave_id)
        if obj:
            db.delete(obj)
            db.commit()
            return True
        return False

    def sumar_horas(self, db: Session, aeronave_id: int, horas: Decimal) -> None:
        obj = db.get(Aeronave, aeronave_id)
        if obj:
            obj.horas_totales = (obj.horas_totales or Decimal("0")) + horas
            db.commit()

    def tiene_alerta_mantenimiento(self, aeronave: Aeronave) -> bool:
        if aeronave.horas_proximo_mantenimiento is None or aeronave.umbral_alerta_horas is None:
            return False
        horas_restantes = aeronave.horas_proximo_mantenimiento - aeronave.horas_totales
        return horas_restantes <= aeronave.umbral_alerta_horas

    def horas_para_mantenimiento(self, aeronave: Aeronave) -> Optional[Decimal]:
        if aeronave.horas_proximo_mantenimiento is None:
            return None
        return aeronave.horas_proximo_mantenimiento - aeronave.horas_totales

    def to_read(self, aeronave: Aeronave) -> AeronaveRead:
        data = aeronave.model_dump()
        data["alerta_mantenimiento"] = self.tiene_alerta_mantenimiento(aeronave)
        data["horas_para_mantenimiento"] = self.horas_para_mantenimiento(aeronave)
        return AeronaveRead(**data)

    def get_aeronaves_con_alerta(self, db: Session) -> List[Aeronave]:
        aeronaves = self.get_aeronaves(db, is_active=True, limit=1000)
        return [a for a in aeronaves if self.tiene_alerta_mantenimiento(a)]


# ---------------------------------------------------------------------------
# PilotoService
# ---------------------------------------------------------------------------

class PilotoService:
    def get_piloto(self, db: Session, piloto_id: int) -> Optional[Piloto]:
        stmt = (sa_select(Piloto)
                .options(selectinload(Piloto.habilitaciones))
                .where(Piloto.id == piloto_id))
        return db.execute(stmt).scalars().first()

    def get_piloto_by_user_id(self, db: Session, user_id: int) -> Optional[Piloto]:
        stmt = (sa_select(Piloto)
                .options(selectinload(Piloto.habilitaciones))
                .where(Piloto.user_id == user_id))
        return db.execute(stmt).scalars().first()

    def get_pilotos(self, db: Session, skip: int = 0, limit: int = 100) -> List[Piloto]:
        stmt = (sa_select(Piloto)
                .options(selectinload(Piloto.habilitaciones))
                .offset(skip).limit(limit))
        return list(db.execute(stmt).scalars().unique().all())

    def count_pilotos(self, db: Session) -> int:
        return db.exec(select(func.count(Piloto.id))).one()

    def create_piloto(self, db: Session, data: PilotoCreate) -> Piloto:
        habilitacion_ids = data.habilitacion_ids
        obj_data = data.model_dump(exclude={"habilitacion_ids"})
        obj = Piloto(**obj_data)
        if habilitacion_ids:
            habs = list(db.exec(select(HabilitacionTipo).where(HabilitacionTipo.id.in_(habilitacion_ids))).all())
            obj.habilitaciones = habs
        db.add(obj)
        db.commit()
        db.refresh(obj)
        return self.get_piloto(db, obj.id)

    def update_piloto(self, db: Session, piloto_id: int, data: PilotoUpdate) -> Optional[Piloto]:
        obj = self.get_piloto(db, piloto_id)
        if obj:
            update_data = data.model_dump(exclude_unset=True)
            habilitacion_ids = update_data.pop("habilitacion_ids", None)
            for field, value in update_data.items():
                setattr(obj, field, value)
            if habilitacion_ids is not None:
                habs = list(db.exec(select(HabilitacionTipo).where(HabilitacionTipo.id.in_(habilitacion_ids))).all())
                obj.habilitaciones = habs
            db.commit()
            return self.get_piloto(db, piloto_id)
        return None

    def delete_piloto(self, db: Session, piloto_id: int) -> bool:
        obj = self.get_piloto(db, piloto_id)
        if obj:
            db.delete(obj)
            db.commit()
            return True
        return False

    def psicofisico_vencido(self, piloto: Piloto) -> bool:
        return piloto.psicofisico_vence < date_cls.today()

    def puede_volar_aeronave(self, piloto: Piloto, aeronave: Aeronave) -> bool:
        return any(h.nombre == aeronave.tipo for h in piloto.habilitaciones)

    def puede_operar_tipo(self, piloto: Piloto, tipo_operacion: TipoOperacion) -> bool:
        requeridas = {h.id for h in tipo_operacion.habilitaciones_requeridas}
        propias = {h.id for h in piloto.habilitaciones}
        return requeridas.issubset(propias)

    def to_read(self, piloto: Piloto, db: Optional[Session] = None) -> PilotoRead:
        data = piloto.model_dump()
        data["habilitaciones"] = [HabilitacionTipoRead.model_validate(h) for h in piloto.habilitaciones]
        data["psicofisico_vencido"] = self.psicofisico_vencido(piloto)
        if db is not None:
            user = db.get(User, piloto.user_id)
            if user:
                data["nombre_completo"] = user.full_name or user.username
        return PilotoRead(**data)


# ---------------------------------------------------------------------------
# TipoOperacionService
# ---------------------------------------------------------------------------

class TipoOperacionService:
    def get_tipo_operacion(self, db: Session, tipo_id: int) -> Optional[TipoOperacion]:
        stmt = (sa_select(TipoOperacion)
                .options(selectinload(TipoOperacion.habilitaciones_requeridas))
                .where(TipoOperacion.id == tipo_id))
        return db.execute(stmt).scalars().first()

    def get_tipo_by_nombre(self, db: Session, nombre: str) -> Optional[TipoOperacion]:
        return db.exec(select(TipoOperacion).where(TipoOperacion.nombre == nombre)).first()

    def get_tipos_operacion(self, db: Session, skip: int = 0, limit: int = 100,
                            is_active: Optional[bool] = None) -> List[TipoOperacion]:
        stmt = sa_select(TipoOperacion).options(selectinload(TipoOperacion.habilitaciones_requeridas))
        if is_active is not None:
            stmt = stmt.where(TipoOperacion.is_active == is_active)
        return list(db.execute(stmt.offset(skip).limit(limit)).scalars().unique().all())

    def count_tipos(self, db: Session, is_active: Optional[bool] = None) -> int:
        query = select(func.count(TipoOperacion.id))
        if is_active is not None:
            query = query.where(TipoOperacion.is_active == is_active)
        return db.exec(query).one()

    def create_tipo_operacion(self, db: Session, data: TipoOperacionCreate) -> TipoOperacion:
        habilitacion_ids = data.habilitacion_ids
        obj_data = data.model_dump(exclude={"habilitacion_ids"})
        obj = TipoOperacion(**obj_data)
        if habilitacion_ids:
            habs = list(db.exec(select(HabilitacionTipo).where(HabilitacionTipo.id.in_(habilitacion_ids))).all())
            obj.habilitaciones_requeridas = habs
        db.add(obj)
        db.commit()
        db.refresh(obj)
        return self.get_tipo_operacion(db, obj.id)

    def update_tipo_operacion(self, db: Session, tipo_id: int, data: TipoOperacionUpdate) -> Optional[TipoOperacion]:
        obj = self.get_tipo_operacion(db, tipo_id)
        if obj:
            update_data = data.model_dump(exclude_unset=True)
            habilitacion_ids = update_data.pop("habilitacion_ids", None)
            for field, value in update_data.items():
                setattr(obj, field, value)
            if habilitacion_ids is not None:
                habs = list(db.exec(select(HabilitacionTipo).where(HabilitacionTipo.id.in_(habilitacion_ids))).all())
                obj.habilitaciones_requeridas = habs
            db.commit()
            return self.get_tipo_operacion(db, tipo_id)
        return None

    def delete_tipo_operacion(self, db: Session, tipo_id: int) -> bool:
        obj = self.get_tipo_operacion(db, tipo_id)
        if obj:
            db.delete(obj)
            db.commit()
            return True
        return False


# ---------------------------------------------------------------------------
# PlanificacionService
# ---------------------------------------------------------------------------

class PlanificacionService:
    def _load_stmt(self):
        return (sa_select(Planificacion)
                .options(
                    selectinload(Planificacion.piloto).selectinload(Piloto.habilitaciones),
                    selectinload(Planificacion.aeronave),
                    selectinload(Planificacion.tipo_operacion).selectinload(TipoOperacion.habilitaciones_requeridas),
                ))

    def get_planificacion(self, db: Session, planificacion_id: int) -> Optional[Planificacion]:
        stmt = self._load_stmt().where(Planificacion.id == planificacion_id)
        return db.execute(stmt).scalars().first()

    def get_planificaciones(self, db: Session, skip: int = 0, limit: int = 100,
                            piloto_id: Optional[int] = None,
                            fecha_desde=None, fecha_hasta=None,
                            status: Optional[str] = None,
                            aeronave_id: Optional[int] = None) -> List[Planificacion]:
        stmt = self._load_stmt()
        if piloto_id is not None:
            stmt = stmt.where(Planificacion.piloto_id == piloto_id)
        if fecha_desde:
            stmt = stmt.where(Planificacion.fecha >= fecha_desde)
        if fecha_hasta:
            stmt = stmt.where(Planificacion.fecha <= fecha_hasta)
        if status:
            stmt = stmt.where(Planificacion.status == status)
        if aeronave_id:
            stmt = stmt.where(Planificacion.aeronave_id == aeronave_id)
        stmt = stmt.order_by(Planificacion.fecha.asc(), Planificacion.hora_inicio.asc())
        return list(db.execute(stmt.offset(skip).limit(limit)).scalars().unique().all())

    def count_planificaciones(self, db: Session, piloto_id: Optional[int] = None,
                              fecha_desde=None, fecha_hasta=None,
                              status: Optional[str] = None) -> int:
        query = select(func.count(Planificacion.id))
        if piloto_id is not None:
            query = query.where(Planificacion.piloto_id == piloto_id)
        if fecha_desde:
            query = query.where(Planificacion.fecha >= fecha_desde)
        if fecha_hasta:
            query = query.where(Planificacion.fecha <= fecha_hasta)
        if status:
            query = query.where(Planificacion.status == status)
        return db.exec(query).one()

    def _validar_asignacion(self, piloto: Piloto, aeronave: Aeronave, tipo_operacion: TipoOperacion) -> None:
        if piloto_service.psicofisico_vencido(piloto):
            raise HTTPException(
                status_code=422,
                detail="El piloto tiene el psicofísico vencido y no puede ser asignado.",
            )
        if not piloto_service.puede_volar_aeronave(piloto, aeronave):
            raise HTTPException(
                status_code=422,
                detail=f"El piloto no tiene habilitación para aeronaves de tipo '{aeronave.tipo}'.",
            )
        if not piloto_service.puede_operar_tipo(piloto, tipo_operacion):
            faltantes = [h.nombre for h in tipo_operacion.habilitaciones_requeridas
                         if h.id not in {p.id for p in piloto.habilitaciones}]
            raise HTTPException(
                status_code=422,
                detail=f"El piloto no tiene las habilitaciones requeridas para '{tipo_operacion.nombre}': {faltantes}.",
            )

    def create_planificacion(self, db: Session, data: PlanificacionCreate,
                             created_by_id: Optional[int] = None) -> Planificacion:
        piloto = piloto_service.get_piloto(db, data.piloto_id)
        aeronave = aeronave_service.get_aeronave(db, data.aeronave_id)
        tipo_op = tipo_operacion_service.get_tipo_operacion(db, data.tipo_operacion_id)
        if not piloto:
            raise HTTPException(status_code=404, detail="Piloto no encontrado.")
        if not aeronave:
            raise HTTPException(status_code=404, detail="Aeronave no encontrada.")
        if not tipo_op:
            raise HTTPException(status_code=404, detail="Tipo de operación no encontrado.")
        self._validar_asignacion(piloto, aeronave, tipo_op)
        obj = Planificacion(**data.model_dump(), created_by_id=created_by_id)
        db.add(obj)
        db.commit()
        db.refresh(obj)
        return self.get_planificacion(db, obj.id)

    def update_planificacion(self, db: Session, planificacion_id: int,
                             data: PlanificacionUpdate) -> Optional[Planificacion]:
        obj = self.get_planificacion(db, planificacion_id)
        if not obj:
            return None
        update_data = data.model_dump(exclude_unset=True)
        nuevo_piloto_id = update_data.get("piloto_id", obj.piloto_id)
        nuevo_aeronave_id = update_data.get("aeronave_id", obj.aeronave_id)
        nuevo_tipo_id = update_data.get("tipo_operacion_id", obj.tipo_operacion_id)
        if any(k in update_data for k in ("piloto_id", "aeronave_id", "tipo_operacion_id")):
            piloto = piloto_service.get_piloto(db, nuevo_piloto_id)
            aeronave = aeronave_service.get_aeronave(db, nuevo_aeronave_id)
            tipo_op = tipo_operacion_service.get_tipo_operacion(db, nuevo_tipo_id)
            if piloto and aeronave and tipo_op:
                self._validar_asignacion(piloto, aeronave, tipo_op)
        for field, value in update_data.items():
            setattr(obj, field, value)
        db.commit()
        return self.get_planificacion(db, planificacion_id)

    def cancelar_planificacion(self, db: Session, planificacion_id: int) -> Optional[Planificacion]:
        obj = self.get_planificacion(db, planificacion_id)
        if obj:
            obj.status = PlanificacionStatusEnum.cancelado
            db.commit()
        return obj


# ---------------------------------------------------------------------------
# RegistroVueloService
# ---------------------------------------------------------------------------

def _calcular_horas_vuelo(hora_inicio: time_cls, hora_fin: time_cls) -> Decimal:
    base = date_cls(2000, 1, 1)
    inicio = dt_cls.combine(base, hora_inicio)
    fin = dt_cls.combine(base, hora_fin)
    if fin <= inicio:
        fin += timedelta(days=1)
    minutos = (fin - inicio).total_seconds() / 60
    return Decimal(str(minutos / 60)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


class RegistroVueloService:
    def _load_stmt(self):
        return (sa_select(RegistroVuelo)
                .options(
                    selectinload(RegistroVuelo.planificacion),
                    selectinload(RegistroVuelo.aeronave),
                ))

    def get_registro(self, db: Session, registro_id: int) -> Optional[RegistroVuelo]:
        stmt = self._load_stmt().where(RegistroVuelo.id == registro_id)
        return db.execute(stmt).scalars().first()

    def get_registros(self, db: Session, skip: int = 0, limit: int = 100,
                      piloto_id: Optional[int] = None,
                      aeronave_id: Optional[int] = None) -> List[RegistroVuelo]:
        stmt = self._load_stmt()
        if piloto_id is not None:
            stmt = stmt.where(RegistroVuelo.piloto_id == piloto_id)
        if aeronave_id is not None:
            stmt = stmt.where(RegistroVuelo.aeronave_id == aeronave_id)
        stmt = stmt.order_by(RegistroVuelo.created_at.desc())
        return list(db.execute(stmt.offset(skip).limit(limit)).scalars().unique().all())

    def count_registros(self, db: Session, piloto_id: Optional[int] = None,
                        aeronave_id: Optional[int] = None) -> int:
        query = select(func.count(RegistroVuelo.id))
        if piloto_id is not None:
            query = query.where(RegistroVuelo.piloto_id == piloto_id)
        if aeronave_id is not None:
            query = query.where(RegistroVuelo.aeronave_id == aeronave_id)
        return db.exec(query).one()

    def create_registro(self, db: Session, data: RegistroVueloCreate,
                        current_piloto: Piloto) -> RegistroVuelo:
        planificacion = db.get(Planificacion, data.planificacion_id)
        if not planificacion:
            raise HTTPException(status_code=404, detail="Planificación no encontrada.")
        if planificacion.piloto_id != current_piloto.id:
            raise HTTPException(
                status_code=403,
                detail="Solo el piloto asignado puede cargar el registro de vuelo.",
            )
        if planificacion.status == PlanificacionStatusEnum.cancelado:
            raise HTTPException(status_code=422, detail="No se puede registrar vuelo en una planificación cancelada.")
        existing = db.exec(select(RegistroVuelo).where(RegistroVuelo.planificacion_id == data.planificacion_id)).first()
        if existing:
            raise HTTPException(status_code=409, detail="Ya existe un registro de vuelo para esta planificación.")
        horas_vuelo = _calcular_horas_vuelo(data.hora_inicio_real, data.hora_fin_real)
        obj = RegistroVuelo(
            planificacion_id=data.planificacion_id,
            piloto_id=current_piloto.id,
            aeronave_id=planificacion.aeronave_id,
            hora_inicio_real=data.hora_inicio_real,
            hora_fin_real=data.hora_fin_real,
            horas_vuelo=horas_vuelo,
            combustible_litros=data.combustible_litros,
            aceite_litros=data.aceite_litros,
            novedades=data.novedades,
        )
        db.add(obj)
        aeronave_service.sumar_horas(db, planificacion.aeronave_id, horas_vuelo)
        planificacion.status = PlanificacionStatusEnum.completado
        db.commit()
        db.refresh(obj)
        return self.get_registro(db, obj.id)

    def update_registro(self, db: Session, registro_id: int, data: RegistroVueloUpdate,
                        current_piloto: Piloto) -> Optional[RegistroVuelo]:
        obj = self.get_registro(db, registro_id)
        if not obj:
            return None
        if obj.piloto_id != current_piloto.id:
            raise HTTPException(
                status_code=403,
                detail="Solo el piloto que creó el registro puede modificarlo.",
            )
        update_data = data.model_dump(exclude_unset=True)
        nueva_inicio = update_data.get("hora_inicio_real", obj.hora_inicio_real)
        nueva_fin = update_data.get("hora_fin_real", obj.hora_fin_real)
        if ("hora_inicio_real" in update_data or "hora_fin_real" in update_data) \
                and nueva_inicio is not None and nueva_fin is not None:
            nueva_horas = _calcular_horas_vuelo(nueva_inicio, nueva_fin)
            diferencia = nueva_horas - obj.horas_vuelo
            aeronave_service.sumar_horas(db, obj.aeronave_id, diferencia)
            update_data["horas_vuelo"] = nueva_horas
        for field, value in update_data.items():
            setattr(obj, field, value)
        db.commit()
        return self.get_registro(db, registro_id)


habilitacion_tipo_service = HabilitacionTipoService()
aeronave_service = AeronaveService()
piloto_service = PilotoService()
tipo_operacion_service = TipoOperacionService()
planificacion_service = PlanificacionService()
registro_vuelo_service = RegistroVueloService()
