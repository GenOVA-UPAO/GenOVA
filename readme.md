Estructura del proyecto:
GENOVA/                  ← raíz del monorepo
├── frontend/                  ← React + tailwind or boostrap(Se va a usar pnpm para evitar errores)
├── backend/                   ← Python (FastAPI)
│   ├── agents/                ← módulo de agentes Prometheus
│   ├── rag/                   ← pipeline RAG
│   └── scorm/                 ← motor de exportación SCORM
├── docker-compose.yml         ← orquestación local y producción
├── docker-compose.prod.yml    ← overrides de producción
└── docs/                      ← toda la documentación del proyecto

Toda el codigo tiene que hacerce de forma modular(Tratar de no tener codigo de más de 100 o 200 líneas).