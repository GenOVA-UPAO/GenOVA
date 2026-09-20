FROM node:22-alpine

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@11.11.0 --activate

COPY package.json pnpm-lock.yaml* ./

# pnpm 11 strictDepBuilds: allowBuilds vive en el monorepo (fuera de ./frontend).
RUN printf '%s\n' \
      'allowBuilds:' \
      "  '@parcel/watcher': true" \
      '  esbuild: true' \
      '  less: false' \
      '  lmdb: true' \
      '  msgpackr-extract: true' \
      '  nx: false' \
      > pnpm-workspace.yaml

RUN --mount=type=cache,id=pnpm-frontend,target=/root/.local/share/pnpm/store \
    pnpm install --no-frozen-lockfile

COPY . .

EXPOSE 4200

# Vite dev server en 0.0.0.0:4200. Nota: vite.config.ts actualmente proxia
# /api y /auth a http://127.0.0.1:8000 por defecto.
CMD ["pnpm", "dev", "--host", "0.0.0.0", "--port", "4200"]
