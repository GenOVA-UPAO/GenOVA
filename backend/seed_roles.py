from database import SessionLocal
from models import Role

# Roles por defecto de GenOVA
DEFAULT_ROLES = [
    {"name": "admin", "description": "Administrador total del sistema. Puede gestionar usuarios y configuraciones."},
    {"name": "teacher", "description": "Profesor o Creador. Puede crear, editar y publicar Objetos Virtuales de Aprendizaje (OVAs)."},
    {"name": "student", "description": "Estudiante o Consumidor. Solo tiene permisos para ver y consumir los OVAs."}
]

def seed_roles():
    print("Iniciando la carga de roles por defecto...")
    
    with SessionLocal() as session:
        for role_data in DEFAULT_ROLES:
            # Verificamos si el rol ya existe
            existing_role = session.query(Role).filter_by(name=role_data["name"]).first()
            
            if not existing_role:
                new_role = Role(name=role_data["name"], description=role_data["description"])
                session.add(new_role)
                print(f"-> Rol creado: {role_data['name']}")
            else:
                print(f"-> El rol ya existe, ignorando: {role_data['name']}")
        
        # Confirmamos los cambios
        session.commit()
        print("Carga de roles finalizada con éxito.")

if __name__ == "__main__":
    seed_roles()
