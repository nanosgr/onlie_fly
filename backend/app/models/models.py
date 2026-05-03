import enum
from typing import List, Optional
from datetime import datetime, date, time
from decimal import Decimal
from sqlmodel import SQLModel, Field, Relationship
from sqlalchemy import Column, DateTime, Integer, ForeignKey, Numeric, Date, Time
from sqlalchemy.sql import func
from pydantic import EmailStr


# ---------------------------------------------------------------------------
# Tablas de asociación (link models con table=True)
# ---------------------------------------------------------------------------

class UserRoleLink(SQLModel, table=True):
    __tablename__ = "user_roles"

    user_id: Optional[int] = Field(default=None, foreign_key="users.id", primary_key=True)
    role_id: Optional[int] = Field(default=None, foreign_key="roles.id", primary_key=True)
    assigned_at: Optional[datetime] = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), server_default=func.now()),
    )


class RolePermissionLink(SQLModel, table=True):
    __tablename__ = "role_permissions"

    role_id: Optional[int] = Field(default=None, foreign_key="roles.id", primary_key=True)
    permission_id: Optional[int] = Field(default=None, foreign_key="permissions.id", primary_key=True)
    assigned_at: Optional[datetime] = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), server_default=func.now()),
    )


# ---------------------------------------------------------------------------
# Permission
# ---------------------------------------------------------------------------

class PermissionBase(SQLModel):
    name: str = Field(index=True, unique=True)
    description: Optional[str] = None
    resource: str
    action: str
    is_active: bool = True


class Permission(PermissionBase, table=True):
    __tablename__ = "permissions"

    id: Optional[int] = Field(default=None, primary_key=True)
    created_at: Optional[datetime] = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), server_default=func.now()),
    )
    updated_at: Optional[datetime] = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), onupdate=func.now(), nullable=True),
    )
    roles: List["Role"] = Relationship(back_populates="permissions", link_model=RolePermissionLink, sa_relationship_kwargs={"lazy": "selectin"})


class PermissionCreate(PermissionBase):
    pass


class PermissionRead(PermissionBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class PermissionUpdate(SQLModel):
    name: Optional[str] = None
    description: Optional[str] = None
    resource: Optional[str] = None
    action: Optional[str] = None
    is_active: Optional[bool] = None


# ---------------------------------------------------------------------------
# Role
# ---------------------------------------------------------------------------

class RoleBase(SQLModel):
    name: str = Field(index=True, unique=True)
    description: Optional[str] = None
    is_active: bool = True


class Role(RoleBase, table=True):
    __tablename__ = "roles"

    id: Optional[int] = Field(default=None, primary_key=True)
    created_at: Optional[datetime] = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), server_default=func.now()),
    )
    updated_at: Optional[datetime] = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), onupdate=func.now(), nullable=True),
    )
    users: List["User"] = Relationship(back_populates="roles", link_model=UserRoleLink, sa_relationship_kwargs={"lazy": "selectin"})
    permissions: List[Permission] = Relationship(back_populates="roles", link_model=RolePermissionLink, sa_relationship_kwargs={"lazy": "selectin"})


class RoleCreate(RoleBase):
    pass


class RoleRead(RoleBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    permissions: List[PermissionRead] = []


class RoleUpdate(SQLModel):
    name: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None


# ---------------------------------------------------------------------------
# User
# ---------------------------------------------------------------------------

class UserBase(SQLModel):
    username: str = Field(index=True, unique=True)
    email: EmailStr = Field(index=True, unique=True)
    full_name: Optional[str] = None
    is_active: bool = True


class User(UserBase, table=True):
    __tablename__ = "users"

    id: Optional[int] = Field(default=None, primary_key=True)
    hashed_password: str
    is_superuser: bool = False
    token_version: int = Field(default=1)
    created_by: Optional[int] = Field(
        default=None,
        sa_column=Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
    )
    created_at: Optional[datetime] = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), server_default=func.now()),
    )
    updated_at: Optional[datetime] = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), onupdate=func.now(), nullable=True),
    )
    roles: List[Role] = Relationship(back_populates="users", link_model=UserRoleLink, sa_relationship_kwargs={"lazy": "selectin"})


class UserCreate(UserBase):
    password: str


class UserRead(UserBase):
    id: int
    is_superuser: bool
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    roles: List[RoleRead] = []


class UserUpdate(SQLModel):
    username: Optional[str] = None
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    is_active: Optional[bool] = None
    password: Optional[str] = None


# ---------------------------------------------------------------------------
# AuditLog
# ---------------------------------------------------------------------------

class AuditLog(SQLModel, table=True):
    __tablename__ = "audit_logs"

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: Optional[int] = Field(
        default=None,
        sa_column=Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
    )
    username: Optional[str] = None
    action: str
    resource: str
    resource_id: Optional[int] = None
    details: Optional[str] = None
    ip_address: Optional[str] = None
    request_id: Optional[str] = None
    status: str = Field(default="success")
    before_data: Optional[str] = None
    after_data: Optional[str] = None
    subject_id: Optional[int] = None
    user_agent: Optional[str] = None
    timestamp: Optional[datetime] = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), server_default=func.now()),
    )


# ---------------------------------------------------------------------------
# PasswordResetToken
# ---------------------------------------------------------------------------

class PasswordResetToken(SQLModel, table=True):
    __tablename__ = "password_reset_tokens"

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(
        sa_column=Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    )
    token_hash: str = Field(index=True)
    expires_at: datetime
    used: bool = Field(default=False)
    used_at: Optional[datetime] = None
    ip_requested: Optional[str] = None
    created_at: Optional[datetime] = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), server_default=func.now()),
    )


# ---------------------------------------------------------------------------
# Enums del dominio aeronáutico
# ---------------------------------------------------------------------------

class LicenciaTipoEnum(str, enum.Enum):
    privado = "privado"
    comercial = "comercial"
    transporte_linea_aerea = "transporte_linea_aerea"


class PlanificacionStatusEnum(str, enum.Enum):
    programado = "programado"
    completado = "completado"
    cancelado = "cancelado"


# ---------------------------------------------------------------------------
# Tablas de asociación del dominio aeronáutico
# ---------------------------------------------------------------------------

class PilotoHabilitacionLink(SQLModel, table=True):
    __tablename__ = "piloto_habilitaciones"

    piloto_id: Optional[int] = Field(default=None, foreign_key="pilotos.id", primary_key=True)
    habilitacion_tipo_id: Optional[int] = Field(default=None, foreign_key="habilitacion_tipos.id", primary_key=True)


class TipoOperacionHabilitacionLink(SQLModel, table=True):
    __tablename__ = "tipo_operacion_habilitaciones"

    tipo_operacion_id: Optional[int] = Field(default=None, foreign_key="tipo_operaciones.id", primary_key=True)
    habilitacion_tipo_id: Optional[int] = Field(default=None, foreign_key="habilitacion_tipos.id", primary_key=True)


# ---------------------------------------------------------------------------
# HabilitacionTipo
# ---------------------------------------------------------------------------

class HabilitacionTipoBase(SQLModel):
    nombre: str = Field(index=True, unique=True)
    descripcion: Optional[str] = None


class HabilitacionTipo(HabilitacionTipoBase, table=True):
    __tablename__ = "habilitacion_tipos"

    id: Optional[int] = Field(default=None, primary_key=True)
    pilotos: List["Piloto"] = Relationship(
        back_populates="habilitaciones",
        link_model=PilotoHabilitacionLink,
        sa_relationship_kwargs={"lazy": "selectin"},
    )
    tipos_operacion: List["TipoOperacion"] = Relationship(
        back_populates="habilitaciones_requeridas",
        link_model=TipoOperacionHabilitacionLink,
        sa_relationship_kwargs={"lazy": "selectin"},
    )


class HabilitacionTipoCreate(HabilitacionTipoBase):
    pass


class HabilitacionTipoRead(HabilitacionTipoBase):
    id: int


class HabilitacionTipoUpdate(SQLModel):
    nombre: Optional[str] = None
    descripcion: Optional[str] = None


# ---------------------------------------------------------------------------
# Aeronave
# ---------------------------------------------------------------------------

class AeronaveBase(SQLModel):
    matricula: str = Field(index=True, unique=True)
    modelo: str
    tipo: str  # "monomotor" | "bimotor" | "otro"
    fabricante: Optional[str] = None
    horas_totales: Decimal = Field(
        default=Decimal("0.00"),
        sa_column=Column(Numeric(10, 2), nullable=False, server_default="0.00"),
    )
    horas_proximo_mantenimiento: Optional[Decimal] = Field(
        default=None,
        sa_column=Column(Numeric(10, 2), nullable=True),
    )
    umbral_alerta_horas: Optional[Decimal] = Field(
        default=None,
        sa_column=Column(Numeric(10, 2), nullable=True),
    )
    notas: Optional[str] = None
    is_active: bool = True


class Aeronave(AeronaveBase, table=True):
    __tablename__ = "aeronaves"

    id: Optional[int] = Field(default=None, primary_key=True)
    created_at: Optional[datetime] = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), server_default=func.now()),
    )
    updated_at: Optional[datetime] = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), onupdate=func.now(), nullable=True),
    )
    planificaciones: List["Planificacion"] = Relationship(
        back_populates="aeronave",
        sa_relationship_kwargs={"lazy": "selectin"},
    )
    registros_vuelo: List["RegistroVuelo"] = Relationship(
        back_populates="aeronave",
        sa_relationship_kwargs={"lazy": "selectin"},
    )


class AeronaveCreate(AeronaveBase):
    pass


class AeronaveRead(AeronaveBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    alerta_mantenimiento: bool = False
    horas_para_mantenimiento: Optional[Decimal] = None


class AeronaveUpdate(SQLModel):
    matricula: Optional[str] = None
    modelo: Optional[str] = None
    tipo: Optional[str] = None
    fabricante: Optional[str] = None
    horas_proximo_mantenimiento: Optional[Decimal] = None
    umbral_alerta_horas: Optional[Decimal] = None
    notas: Optional[str] = None
    is_active: Optional[bool] = None


# ---------------------------------------------------------------------------
# Piloto
# ---------------------------------------------------------------------------

class PilotoBase(SQLModel):
    licencia_tipo: LicenciaTipoEnum
    numero_licencia: str = Field(index=True, unique=True)
    psicofisico_vence: date = Field(sa_column=Column(Date, nullable=False))


class Piloto(PilotoBase, table=True):
    __tablename__ = "pilotos"

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(
        sa_column=Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    )
    created_at: Optional[datetime] = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), server_default=func.now()),
    )
    updated_at: Optional[datetime] = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), onupdate=func.now(), nullable=True),
    )
    habilitaciones: List[HabilitacionTipo] = Relationship(
        back_populates="pilotos",
        link_model=PilotoHabilitacionLink,
        sa_relationship_kwargs={"lazy": "selectin"},
    )
    planificaciones: List["Planificacion"] = Relationship(
        back_populates="piloto",
        sa_relationship_kwargs={"lazy": "selectin"},
    )
    registros_vuelo: List["RegistroVuelo"] = Relationship(
        back_populates="piloto",
        sa_relationship_kwargs={"lazy": "selectin"},
    )


class PilotoCreate(PilotoBase):
    user_id: int
    habilitacion_ids: List[int] = []


class PilotoRead(PilotoBase):
    id: int
    user_id: int
    habilitaciones: List[HabilitacionTipoRead] = []
    psicofisico_vencido: bool = False
    nombre_completo: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class PilotoUpdate(SQLModel):
    licencia_tipo: Optional[LicenciaTipoEnum] = None
    numero_licencia: Optional[str] = None
    psicofisico_vence: Optional[date] = None
    habilitacion_ids: Optional[List[int]] = None


# ---------------------------------------------------------------------------
# TipoOperacion
# ---------------------------------------------------------------------------

class TipoOperacionBase(SQLModel):
    nombre: str = Field(index=True, unique=True)
    descripcion: Optional[str] = None
    is_active: bool = True


class TipoOperacion(TipoOperacionBase, table=True):
    __tablename__ = "tipo_operaciones"

    id: Optional[int] = Field(default=None, primary_key=True)
    created_at: Optional[datetime] = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), server_default=func.now()),
    )
    updated_at: Optional[datetime] = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), onupdate=func.now(), nullable=True),
    )
    habilitaciones_requeridas: List[HabilitacionTipo] = Relationship(
        back_populates="tipos_operacion",
        link_model=TipoOperacionHabilitacionLink,
        sa_relationship_kwargs={"lazy": "selectin"},
    )
    planificaciones: List["Planificacion"] = Relationship(
        back_populates="tipo_operacion",
        sa_relationship_kwargs={"lazy": "selectin"},
    )


class TipoOperacionCreate(TipoOperacionBase):
    habilitacion_ids: List[int] = []


class TipoOperacionRead(TipoOperacionBase):
    id: int
    habilitaciones_requeridas: List[HabilitacionTipoRead] = []
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class TipoOperacionUpdate(SQLModel):
    nombre: Optional[str] = None
    descripcion: Optional[str] = None
    is_active: Optional[bool] = None
    habilitacion_ids: Optional[List[int]] = None


# ---------------------------------------------------------------------------
# Planificacion
# ---------------------------------------------------------------------------

class PlanificacionBase(SQLModel):
    fecha: date = Field(sa_column=Column(Date, nullable=False))
    hora_inicio: time = Field(sa_column=Column(Time, nullable=False))
    hora_fin: Optional[time] = Field(default=None, sa_column=Column(Time, nullable=True))
    notas: Optional[str] = None
    status: PlanificacionStatusEnum = PlanificacionStatusEnum.programado


class Planificacion(PlanificacionBase, table=True):
    __tablename__ = "planificaciones"

    id: Optional[int] = Field(default=None, primary_key=True)
    piloto_id: int = Field(
        sa_column=Column(Integer, ForeignKey("pilotos.id", ondelete="RESTRICT"), nullable=False)
    )
    aeronave_id: int = Field(
        sa_column=Column(Integer, ForeignKey("aeronaves.id", ondelete="RESTRICT"), nullable=False)
    )
    tipo_operacion_id: int = Field(
        sa_column=Column(Integer, ForeignKey("tipo_operaciones.id", ondelete="RESTRICT"), nullable=False)
    )
    created_by_id: Optional[int] = Field(
        default=None,
        sa_column=Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
    )
    created_at: Optional[datetime] = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), server_default=func.now()),
    )
    updated_at: Optional[datetime] = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), onupdate=func.now(), nullable=True),
    )
    piloto: Optional[Piloto] = Relationship(
        back_populates="planificaciones",
        sa_relationship_kwargs={"lazy": "selectin"},
    )
    aeronave: Optional[Aeronave] = Relationship(
        back_populates="planificaciones",
        sa_relationship_kwargs={"lazy": "selectin"},
    )
    tipo_operacion: Optional[TipoOperacion] = Relationship(
        back_populates="planificaciones",
        sa_relationship_kwargs={"lazy": "selectin"},
    )
    registro_vuelo: Optional["RegistroVuelo"] = Relationship(
        back_populates="planificacion",
        sa_relationship_kwargs={"lazy": "selectin", "uselist": False},
    )


class PlanificacionCreate(PlanificacionBase):
    piloto_id: int
    aeronave_id: int
    tipo_operacion_id: int


class PlanificacionRead(PlanificacionBase):
    id: int
    piloto_id: int
    aeronave_id: int
    tipo_operacion_id: int
    created_by_id: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    piloto: Optional[PilotoRead] = None
    aeronave: Optional[AeronaveRead] = None
    tipo_operacion: Optional[TipoOperacionRead] = None


class PlanificacionUpdate(SQLModel):
    fecha: Optional[date] = None
    hora_inicio: Optional[time] = None
    hora_fin: Optional[time] = None
    piloto_id: Optional[int] = None
    aeronave_id: Optional[int] = None
    tipo_operacion_id: Optional[int] = None
    notas: Optional[str] = None
    status: Optional[PlanificacionStatusEnum] = None


# ---------------------------------------------------------------------------
# RegistroVuelo
# ---------------------------------------------------------------------------

class RegistroVueloBase(SQLModel):
    horas_vuelo: Decimal = Field(
        sa_column=Column(Numeric(8, 2), nullable=False)
    )
    combustible_litros: Optional[Decimal] = Field(
        default=None,
        sa_column=Column(Numeric(8, 2), nullable=True),
    )
    aceite_litros: Optional[Decimal] = Field(
        default=None,
        sa_column=Column(Numeric(8, 2), nullable=True),
    )
    novedades: Optional[str] = None


class RegistroVuelo(RegistroVueloBase, table=True):
    __tablename__ = "registros_vuelo"

    id: Optional[int] = Field(default=None, primary_key=True)
    planificacion_id: int = Field(
        sa_column=Column(Integer, ForeignKey("planificaciones.id", ondelete="RESTRICT"), unique=True, nullable=False)
    )
    piloto_id: int = Field(
        sa_column=Column(Integer, ForeignKey("pilotos.id", ondelete="RESTRICT"), nullable=False)
    )
    aeronave_id: int = Field(
        sa_column=Column(Integer, ForeignKey("aeronaves.id", ondelete="RESTRICT"), nullable=False)
    )
    created_at: Optional[datetime] = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), server_default=func.now()),
    )
    planificacion: Optional[Planificacion] = Relationship(
        back_populates="registro_vuelo",
        sa_relationship_kwargs={"lazy": "selectin"},
    )
    piloto: Optional[Piloto] = Relationship(
        back_populates="registros_vuelo",
        sa_relationship_kwargs={"lazy": "selectin"},
    )
    aeronave: Optional[Aeronave] = Relationship(
        back_populates="registros_vuelo",
        sa_relationship_kwargs={"lazy": "selectin"},
    )


class RegistroVueloCreate(RegistroVueloBase):
    planificacion_id: int


class RegistroVueloRead(RegistroVueloBase):
    id: int
    planificacion_id: int
    piloto_id: int
    aeronave_id: int
    created_at: Optional[datetime] = None
    planificacion: Optional[PlanificacionRead] = None


class RegistroVueloUpdate(SQLModel):
    horas_vuelo: Optional[Decimal] = None
    combustible_litros: Optional[Decimal] = None
    aceite_litros: Optional[Decimal] = None
    novedades: Optional[str] = None


# ---------------------------------------------------------------------------
# Resolver referencias circulares
# ---------------------------------------------------------------------------

Permission.model_rebuild()
Role.model_rebuild()
User.model_rebuild()
RoleRead.model_rebuild()
UserRead.model_rebuild()
PasswordResetToken.model_rebuild()
HabilitacionTipo.model_rebuild()
Aeronave.model_rebuild()
Piloto.model_rebuild()
TipoOperacion.model_rebuild()
Planificacion.model_rebuild()
RegistroVuelo.model_rebuild()
HabilitacionTipoRead.model_rebuild()
AeronaveRead.model_rebuild()
PilotoRead.model_rebuild()
TipoOperacionRead.model_rebuild()
PlanificacionRead.model_rebuild()
RegistroVueloRead.model_rebuild()
