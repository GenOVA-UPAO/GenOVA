FROM python:3.12-slim

# uv: instalador de dependencias ~10x más rápido que pip (binario oficial).
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV UV_LINK_MODE=copy

COPY requirements.txt ./
# requirements.txt sigue siendo la fuente (paridad pip/uv); --system instala en el
# Python de la imagen (sin venv). El cache mount acelera rebuilds.
RUN --mount=type=cache,target=/root/.cache/uv \
    uv pip install --system -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
