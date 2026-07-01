FROM node:22-alpine

WORKDIR /app

# Instalar pnpm
RUN npm install -g pnpm@11.9.0

# Copiar configuración de dependencias
COPY package.json pnpm-lock.yaml* ./

# Instalar dependencias (solo para capa cacheada)
RUN pnpm install --no-frozen-lockfile

# El resto del código se monta en tiempo de ejecución (desarrollo) o se copia (producción)
COPY . .

EXPOSE 4200

# En desarrollo este CMD será sobrescrito por docker-compose
CMD ["pnpm", "dev", "--host", "0.0.0.0", "--port", "4200"]
