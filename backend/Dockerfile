# Misma versión que CI (setup-python 3.11): lo que se prueba es lo que corre.
FROM python:3.11-slim

# uv: instalador de dependencias ~10x más rápido que pip (binario oficial).
# Versión fija: con :latest dos builds del mismo commit podían usar uv distintos.
COPY --from=ghcr.io/astral-sh/uv:0.11.32 /uv /uvx /bin/

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
