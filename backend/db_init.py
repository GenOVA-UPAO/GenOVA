from database import Base, SessionLocal, engine
from models import Role


def run():
    Base.metadata.create_all(bind=engine)

    with SessionLocal() as session:
        role = session.query(Role).filter_by(name="__smoke__").first()
        if not role:
            role = Role(name="__smoke__", description="smoke test")
            session.add(role)
            session.commit()
            session.refresh(role)

        role.description = "smoke test updated"
        session.commit()

        session.delete(role)
        session.commit()


if __name__ == "__main__":
    run()
