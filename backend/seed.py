import os

from sqlalchemy import select

from auth.domain.email import normalize_email
from core.database import SessionLocal
from core.security import hash_password
from models import Role, User, UserRole

_DEMO_ENVS_BLOQUEADOS = {"production", "prod", "staging"}
_MIN_BOOTSTRAP_PASSWORD = 12

_ROLES = [
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

_DEMO_USERS = [
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


def _seed_roles(db) -> dict:
    roles_map = {}
    for r_data in _ROLES:
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
    return roles_map


def _create_user_if_missing(db, u_data: dict, roles_map: dict) -> None:
    existente = db.execute(
        select(User).where(User.email_normalized == normalize_email(u_data["email"]))
    ).scalar_one_or_none()
    if existente is not None:
        # No elevar, no resetear contraseña, no reasignar roles.
        print(f"El usuario {u_data['email']} ya existe: se deja intacto.")
        return
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


def _users_to_seed(demo_permitido: bool, email: str | None, password: str | None) -> list[dict]:
    users = list(_DEMO_USERS) if demo_permitido else []
    if not demo_permitido:
        print("Entorno protegido: no se siembran usuarios demo.")
    if email and password:
        if len(password) < _MIN_BOOTSTRAP_PASSWORD:
            print("ADMIN_BOOTSTRAP_PASSWORD demasiado corta: se ignora el bootstrap.")
        else:
            users.append(
                {
                    "email": email.strip(),
                    "password": password,
                    "full_name": "Administrador",
                    "role": "administrador",
                }
            )
    return users


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
    env = env if env is not None else os.getenv("ENV", "dev")
    email = bootstrap_email or os.getenv("ADMIN_BOOTSTRAP_EMAIL") or None
    password = bootstrap_password or os.getenv("ADMIN_BOOTSTRAP_PASSWORD") or None
    demo_permitido = env.strip().lower() not in _DEMO_ENVS_BLOQUEADOS
    owns_session = db is None
    if db is None:
        db = SessionLocal()
    try:
        roles_map = _seed_roles(db)
        for u_data in _users_to_seed(demo_permitido, email, password):
            _create_user_if_missing(db, u_data, roles_map)
        print("Siembra completada exitosamente. ¡Listo para probar!")
    except Exception as e:
        db.rollback()
        print(f"Error durante la siembra de la base de datos: {e}")
    finally:
        if owns_session:
            db.close()


if __name__ == "__main__":
    seed_db()
