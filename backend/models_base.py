import uuid

from sqlalchemy import Column, text
from sqlalchemy.dialects.postgresql import UUID


def _pk_column() -> Column:
    return Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()"),
    )
