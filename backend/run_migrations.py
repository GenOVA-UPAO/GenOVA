import os
import glob
from sqlalchemy import text
from database import engine

def run_migrations():
    print("Iniciando la aplicación de migraciones SQL...")
    
    # Get migrations directory
    migrations_dir = os.path.join(os.path.dirname(__file__), "migrations")
    if not os.path.exists(migrations_dir):
        print(f"Directorio de migraciones no encontrado: {migrations_dir}")
        return
        
    sql_files = sorted(glob.glob(os.path.join(migrations_dir, "*.sql")))
    
    with engine.connect() as conn:
        for sql_file in sql_files:
            print(f"Aplicando migración: {os.path.basename(sql_file)}")
            with open(sql_file, "r", encoding="utf-8") as f:
                content = f.read()

            # Strip line comments (-- ...) before splitting so multi-line SQL
            # comments don't get treated as standalone statements.
            cleaned_lines = []
            for line in content.splitlines():
                stripped = line.strip()
                if stripped.startswith("--"):
                    continue
                cleaned_lines.append(line)
            cleaned = "\n".join(cleaned_lines)

            # Split by semicolon, filter out empty queries
            queries = [q.strip() for q in cleaned.split(";") if q.strip()]
            
            for query in queries:
                try:
                    # Execute each query individually
                    conn.execute(text(query))
                    # Commit is handled automatically in autocommit mode, 
                    # but since we are using connection directly, we should commit
                    conn.commit()
                except Exception as e:
                    # Ignore errors if they are about already existing items, 
                    # but print other unexpected issues
                    err_msg = str(e)
                    if "already exists" in err_msg or "duplicate key" in err_msg:
                        # Safe to ignore
                        pass
                    else:
                        print(f"  Aviso al ejecutar query [{query[:50]}...]: {err_msg}")
                        
    print("Migraciones aplicadas exitosamente.")

if __name__ == "__main__":
    run_migrations()
