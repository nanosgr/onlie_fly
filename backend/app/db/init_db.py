from sqlmodel import SQLModel, Session, select
from app.db.database import engine
from app.models.models import User, Role, Permission, HabilitacionTipo, TipoOperacion
from app.core.security import get_password_hash


def create_tables():
    SQLModel.metadata.create_all(bind=engine)


def init_db():
    with Session(engine) as db:
        try:
            permissions_data = [
                # Permisos base del sistema
                {"name": "users:create", "description": "Crear usuarios", "resource": "users", "action": "create"},
                {"name": "users:read", "description": "Ver usuarios", "resource": "users", "action": "read"},
                {"name": "users:update", "description": "Actualizar usuarios", "resource": "users", "action": "update"},
                {"name": "users:delete", "description": "Eliminar usuarios", "resource": "users", "action": "delete"},
                {"name": "roles:create", "description": "Crear roles", "resource": "roles", "action": "create"},
                {"name": "roles:read", "description": "Ver roles", "resource": "roles", "action": "read"},
                {"name": "roles:update", "description": "Actualizar roles", "resource": "roles", "action": "update"},
                {"name": "roles:delete", "description": "Eliminar roles", "resource": "roles", "action": "delete"},
                {"name": "permissions:create", "description": "Crear permisos", "resource": "permissions", "action": "create"},
                {"name": "permissions:read", "description": "Ver permisos", "resource": "permissions", "action": "read"},
                {"name": "permissions:update", "description": "Actualizar permisos", "resource": "permissions", "action": "update"},
                {"name": "permissions:delete", "description": "Eliminar permisos", "resource": "permissions", "action": "delete"},
                {"name": "dashboard:read", "description": "Acceder al dashboard", "resource": "dashboard", "action": "read"},
                {"name": "reports:read", "description": "Ver reportes", "resource": "reports", "action": "read"},
                {"name": "reports:export", "description": "Exportar reportes", "resource": "reports", "action": "export"},
                {"name": "settings:read", "description": "Ver configuración", "resource": "settings", "action": "read"},
                {"name": "settings:update", "description": "Actualizar configuración", "resource": "settings", "action": "update"},
                {"name": "audit:read", "description": "Ver logs de auditoría", "resource": "audit", "action": "read"},
                # Permisos del dominio aeronáutico
                {"name": "aeronaves:create", "description": "Crear aeronaves", "resource": "aeronaves", "action": "create"},
                {"name": "aeronaves:read", "description": "Ver aeronaves", "resource": "aeronaves", "action": "read"},
                {"name": "aeronaves:update", "description": "Actualizar aeronaves", "resource": "aeronaves", "action": "update"},
                {"name": "aeronaves:delete", "description": "Eliminar aeronaves", "resource": "aeronaves", "action": "delete"},
                {"name": "pilotos:create", "description": "Crear perfiles de piloto", "resource": "pilotos", "action": "create"},
                {"name": "pilotos:read", "description": "Ver pilotos", "resource": "pilotos", "action": "read"},
                {"name": "pilotos:update", "description": "Actualizar pilotos", "resource": "pilotos", "action": "update"},
                {"name": "pilotos:delete", "description": "Eliminar pilotos", "resource": "pilotos", "action": "delete"},
                {"name": "habilitaciones:create", "description": "Crear tipos de habilitación", "resource": "habilitaciones", "action": "create"},
                {"name": "habilitaciones:read", "description": "Ver habilitaciones", "resource": "habilitaciones", "action": "read"},
                {"name": "habilitaciones:update", "description": "Actualizar habilitaciones", "resource": "habilitaciones", "action": "update"},
                {"name": "habilitaciones:delete", "description": "Eliminar habilitaciones", "resource": "habilitaciones", "action": "delete"},
                {"name": "tipos_operacion:create", "description": "Crear tipos de operación", "resource": "tipos_operacion", "action": "create"},
                {"name": "tipos_operacion:read", "description": "Ver tipos de operación", "resource": "tipos_operacion", "action": "read"},
                {"name": "tipos_operacion:update", "description": "Actualizar tipos de operación", "resource": "tipos_operacion", "action": "update"},
                {"name": "tipos_operacion:delete", "description": "Eliminar tipos de operación", "resource": "tipos_operacion", "action": "delete"},
                {"name": "planificaciones:create", "description": "Crear planificaciones", "resource": "planificaciones", "action": "create"},
                {"name": "planificaciones:read", "description": "Ver todas las planificaciones", "resource": "planificaciones", "action": "read"},
                {"name": "planificaciones:update", "description": "Modificar planificaciones", "resource": "planificaciones", "action": "update"},
                {"name": "planificaciones:delete", "description": "Eliminar planificaciones", "resource": "planificaciones", "action": "delete"},
                {"name": "registros_vuelo:create", "description": "Cargar registros de vuelo", "resource": "registros_vuelo", "action": "create"},
                {"name": "registros_vuelo:read", "description": "Ver registros de vuelo", "resource": "registros_vuelo", "action": "read"},
                {"name": "registros_vuelo:update", "description": "Editar registros de vuelo", "resource": "registros_vuelo", "action": "update"},
            ]

            permissions = []
            for perm_data in permissions_data:
                existing = db.exec(select(Permission).where(Permission.name == perm_data["name"])).first()
                if not existing:
                    permission = Permission(**perm_data)
                    db.add(permission)
                    permissions.append(permission)
                else:
                    permissions.append(existing)

            db.commit()
            for p in permissions:
                db.refresh(p)

            roles_data = [
                {"name": "Super Admin", "description": "Acceso total al sistema"},
                {"name": "Admin", "description": "Administración completa del sistema"},
                {"name": "Jefe de Operaciones", "description": "Planifica operaciones y asigna pilotos y aeronaves"},
                {"name": "Piloto", "description": "Piloto operacional: ve y registra sus propias operaciones"},
            ]

            roles = []
            for role_data in roles_data:
                existing = db.exec(select(Role).where(Role.name == role_data["name"])).first()
                if not existing:
                    role = Role(**role_data)
                    db.add(role)
                    roles.append(role)
                else:
                    roles.append(existing)

            db.commit()
            for r in roles:
                db.refresh(r)

            def get_perms(names):
                return [p for p in permissions if p.name in names]

            if roles and permissions:
                super_admin = next((r for r in roles if r.name == "Super Admin"), None)
                if super_admin and not super_admin.permissions:
                    super_admin.permissions = permissions

                admin = next((r for r in roles if r.name == "Admin"), None)
                if admin and not admin.permissions:
                    admin.permissions = [p for p in permissions if p.name != "permissions:delete"]

                jefe_ops = next((r for r in roles if r.name == "Jefe de Operaciones"), None)
                if jefe_ops and not jefe_ops.permissions:
                    jefe_ops_perms = [
                        "users:read",
                        "dashboard:read", "reports:read",
                        "aeronaves:read", "aeronaves:create", "aeronaves:update",
                        "pilotos:read", "pilotos:create", "pilotos:update",
                        "habilitaciones:read", "habilitaciones:create", "habilitaciones:update",
                        "tipos_operacion:read", "tipos_operacion:create", "tipos_operacion:update", "tipos_operacion:delete",
                        "planificaciones:create", "planificaciones:read", "planificaciones:update", "planificaciones:delete",
                        "registros_vuelo:read",
                    ]
                    jefe_ops.permissions = get_perms(jefe_ops_perms)

                piloto_role = next((r for r in roles if r.name == "Piloto"), None)
                if piloto_role and not piloto_role.permissions:
                    piloto_perms = [
                        "aeronaves:read",
                        "habilitaciones:read",
                        "tipos_operacion:read",
                        "registros_vuelo:create", "registros_vuelo:read", "registros_vuelo:update",
                    ]
                    piloto_role.permissions = get_perms(piloto_perms)

            db.commit()

            users_data = [
                {"username": "superadmin", "email": "superadmin@example.com", "full_name": "Super Administrador", "password": "admin123", "is_superuser": True, "role_name": "Super Admin"},
                {"username": "admin", "email": "admin@example.com", "full_name": "Administrador", "password": "admin123", "is_superuser": False, "role_name": "Admin"},
                {"username": "jefe_ops", "email": "jefe_ops@example.com", "full_name": "Jefe de Operaciones", "password": "jefe123", "is_superuser": False, "role_name": "Jefe de Operaciones"},
                {"username": "piloto1", "email": "piloto1@example.com", "full_name": "Juan Piloto", "password": "piloto123", "is_superuser": False, "role_name": "Piloto"},
                {"username": "piloto2", "email": "piloto2@example.com", "full_name": "María Piloto", "password": "piloto123", "is_superuser": False, "role_name": "Piloto"},
            ]

            for user_data in users_data:
                existing = db.exec(select(User).where(User.username == user_data["username"])).first()
                if not existing:
                    role_name = user_data.pop("role_name")
                    password = user_data.pop("password")
                    user = User(**user_data, hashed_password=get_password_hash(password))
                    role = db.exec(select(Role).where(Role.name == role_name)).first()
                    if role:
                        user.roles.append(role)
                    db.add(user)

            db.commit()

            init_catalogos(db)

            print("Base de datos inicializada correctamente!")
            print("\n=== Usuarios creados ===")
            for user in db.exec(select(User)).all():
                roles_names = [r.name for r in user.roles]
                print(f"Usuario: {user.username} | Roles: {', '.join(roles_names)}")

        except Exception as e:
            print(f"Error inicializando la base de datos: {e}")
            db.rollback()


def init_catalogos(db):
    habilitaciones_data = [
        {"nombre": "monomotor", "descripcion": "Habilitación para aeronaves monomotor"},
        {"nombre": "bimotor", "descripcion": "Habilitación para aeronaves bimotor"},
        {"nombre": "instruccion", "descripcion": "Habilitación para vuelos de instrucción"},
        {"nombre": "fumigacion", "descripcion": "Habilitación para fumigación aérea"},
        {"nombre": "control_incendios", "descripcion": "Habilitación para control de incendios"},
        {"nombre": "radioayuda", "descripcion": "Habilitación para servicios de radioayuda"},
        {"nombre": "industria_petrolera", "descripcion": "Habilitación para servicios a la industria petrolera"},
        {"nombre": "liberacion_insectos", "descripcion": "Habilitación para liberación de insectos"},
    ]
    for h_data in habilitaciones_data:
        existing = db.exec(select(HabilitacionTipo).where(HabilitacionTipo.nombre == h_data["nombre"])).first()
        if not existing:
            db.add(HabilitacionTipo(**h_data))
    db.commit()

    tipos_operacion_data = [
        {"nombre": "Liberación de insectos", "descripcion": "Operación de liberación biológica de insectos"},
        {"nombre": "Fumigación aérea", "descripcion": "Fumigación agrícola o sanitaria"},
        {"nombre": "Control de incendios", "descripcion": "Extinción y control de incendios forestales"},
        {"nombre": "Servicios petroleros", "descripcion": "Apoyo a operaciones de la industria petrolera"},
        {"nombre": "Radioayuda", "descripcion": "Servicio de radioayuda a la navegación aérea"},
        {"nombre": "Instrucción de vuelo", "descripcion": "Vuelos de instrucción en escuela de aviación"},
    ]
    for t_data in tipos_operacion_data:
        existing = db.exec(select(TipoOperacion).where(TipoOperacion.nombre == t_data["nombre"])).first()
        if not existing:
            db.add(TipoOperacion(**t_data))
    db.commit()


if __name__ == "__main__":
    print("Creando tablas...")
    create_tables()
    print("Inicializando datos...")
    init_db()
