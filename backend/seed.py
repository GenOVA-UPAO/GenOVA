from sqlalchemy import select

from auth.email_normalize import normalize_email
from core.database import SessionLocal
from core.security import hash_password
from models import Role, User, UserRole


def seed_db():
    print("Iniciando la siembra (seeding) de la base de datos...")
    db = SessionLocal()
    try:
        # 1. Crear roles
        roles_to_seed = [
            {
                "name": "administrador",
                "description": "Rol del sistema con acceso total",
                "permissions": [
                    "create_ova",
                    "view_ova",
                    "export_ova",
                    "manage_users",
                    "manage_roles",
                    "ai:models:self",
                    "ai:fallback:self",
                    "ai:models:platform",
                    "users:link",
                    "users:link:admin",
                ],
            },
            {
                "name": "profesor",
                "description": "Docente que crea, edita y exporta OVAs",
                "permissions": [
                    "create_ova",
                    "view_ova",
                    "export_ova",
                    "ai:models:self",
                    "ai:fallback:self",
                    "users:link",
                ],
            },
            {
                "name": "estudiante",
                "description": "Estudiante que visualiza OVAs compartidos",
                "permissions": ["view_ova"],
            },
            {
                "name": "usuario",
                "description": "Rol base genérico (legado)",
                "permissions": ["create_ova", "view_ova", "export_ova", "ai:models:self"],
            },
            {
                "name": "usuarios_prueba",
                "description": "Rol para participantes de tesis — acceso a OVAs sin configuración de modelos",
                "permissions": ["create_ova", "view_ova", "export_ova"],
            },
        ]

        roles_map = {}
        for r_data in roles_to_seed:
            role = db.execute(select(Role).where(Role.name == r_data["name"])).scalar_one_or_none()
            if not role:
                print(f"Creando rol: {r_data['name']}")
                role = Role(
                    name=r_data["name"],
                    description=r_data["description"],
                    permissions=r_data["permissions"],
                )
                db.add(role)
                db.commit()
                db.refresh(role)
            else:
                print(f"El rol {r_data['name']} ya existe.")
                # Asegurar permisos actualizados
                role.permissions = r_data["permissions"]  # type: ignore
                db.commit()
            roles_map[r_data["name"]] = role

        # 2. Crear usuarios de prueba
        users_to_seed = [
            {
                "email": "admin@genova.ai",
                "password": "admin1234password",  # Alfanumérico, >= 8 caracteres
                "full_name": "Administrador GenOVA",
                "role": "administrador",
            },
            {
                "email": "profesor@genova.ai",
                "password": "profesor1234password",
                "full_name": "Profesor de Prueba",
                "role": "profesor",
            },
            {
                "email": "estudiante@genova.ai",
                "password": "estudiante1234password",
                "full_name": "Estudiante de Prueba",
                "role": "estudiante",
            },
            {
                "email": "user@genova.ai",
                "password": "user1234password",
                "full_name": "Usuario de Prueba",
                "role": "usuario",
            },
        ]

        for u_data in users_to_seed:
            user = db.execute(
                select(User).where(User.email == u_data["email"])
            ).scalar_one_or_none()
            if not user:
                print(f"Creando usuario: {u_data['email']}")
                user = User(
                    email=u_data["email"],
                    email_normalized=normalize_email(u_data["email"]),
                    password_hash=hash_password(u_data["password"]),
                    full_name=u_data["full_name"],
                    email_verified=True,
                )
                db.add(user)
                db.commit()
                db.refresh(user)

                # Asignar rol
                role = roles_map[u_data["role"]]
                user_role = UserRole(user_id=user.id, role_id=role.id)
                db.add(user_role)
                db.commit()
                print(f"Rol '{u_data['role']}' asignado a {u_data['email']}")
            else:
                print(f"El usuario {u_data['email']} ya existe.")
                # Asegurar que tenga el rol asignado
                role = roles_map[u_data["role"]]
                existing_ur = db.execute(
                    select(UserRole).where(UserRole.user_id == user.id, UserRole.role_id == role.id)
                ).scalar_one_or_none()
                if not existing_ur:
                    user_role = UserRole(user_id=user.id, role_id=role.id)
                    db.add(user_role)
                    db.commit()
                    print(f"Rol '{u_data['role']}' re-asignado a {u_data['email']}")

        print("Siembra completada exitosamente. ¡Listo para probar!")

    except Exception as e:
        db.rollback()
        print(f"Error durante la siembra de la base de datos: {e}")
    finally:
        db.close()


if __name__ == "__main__":
    seed_db()
