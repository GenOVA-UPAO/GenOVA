import os

from sqlalchemy import select

from auth.domain.email import normalize_email
from core.database import SessionLocal
from core.security import hash_password
from models import Role, User, UserRole


_DEMO_ENVS_BLOQUEADOS = {"production", "prod", "staging"}
_MIN_BOOTSTRAP_PASSWORD = 12


def seed_db(
    db=None,
    *,
    env: str | None = None,
    bootstrap_email: str | None = None,
    bootstrap_password: str | None = None,
):
    """Siembra roles y, según el entorno, usuarios.

    - Roles: siempre (idempotente, sin pisar permisos personalizados).
    - Usuarios demo (credenciales fijas del código): SOLO fuera de producción/staging.
    - Admin inicial en producción: ``ADMIN_BOOTSTRAP_EMAIL`` + ``ADMIN_BOOTSTRAP_PASSWORD``
      (secreto externo, >= 12 caracteres), solo si el correo no existe todavía.
    - Un usuario que ya existe NUNCA se toca (ni rol, ni contraseña): coincidir por
      email no concede privilegios.
    """
    print("Iniciando la siembra (seeding) de la base de datos...")
    if env is None:
        env = os.getenv("ENV", "dev")
    if bootstrap_email is None:
        bootstrap_email = os.getenv("ADMIN_BOOTSTRAP_EMAIL") or None
    if bootstrap_password is None:
        bootstrap_password = os.getenv("ADMIN_BOOTSTRAP_PASSWORD") or None
    demo_permitido = env.strip().lower() not in _DEMO_ENVS_BLOQUEADOS
    owns_session = db is None
    if db is None:
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
                    "view_analytics",
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
                    "view_analytics",
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
                # No pisar permissions: el admin puede haberlas personalizado
                # desde /admin/roles. Solo alinear descripción si cambió en seed.
                if role.description != r_data["description"]:
                    role.description = r_data["description"]  # type: ignore
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

        if not demo_permitido:
            print("Entorno protegido: no se siembran usuarios demo.")
            users_to_seed = []
        if bootstrap_email and bootstrap_password:
            if len(bootstrap_password) < _MIN_BOOTSTRAP_PASSWORD:
                print("ADMIN_BOOTSTRAP_PASSWORD demasiado corta: se ignora el bootstrap.")
            else:
                users_to_seed.append(
                    {
                        "email": bootstrap_email.strip(),
                        "password": bootstrap_password,
                        "full_name": "Administrador",
                        "role": "administrador",
                    }
                )

        for u_data in users_to_seed:
            existente = db.execute(
                select(User).where(
                    User.email_normalized == normalize_email(u_data["email"])
                )
            ).scalar_one_or_none()
            if existente is not None:
                # No elevar, no resetear contraseña, no reasignar roles.
                print(f"El usuario {u_data['email']} ya existe: se deja intacto.")
                continue
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
            db.add(UserRole(user_id=user.id, role_id=roles_map[u_data["role"]].id))
            db.commit()
            print(f"Rol '{u_data['role']}' asignado a {u_data['email']}")

        print("Siembra completada exitosamente. ¡Listo para probar!")

    except Exception as e:
        db.rollback()
        print(f"Error durante la siembra de la base de datos: {e}")
    finally:
        if owns_session:
            db.close()


if __name__ == "__main__":
    seed_db()
