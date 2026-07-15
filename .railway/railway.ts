import { defineRailway, github, preserve, project, redis, service, volume } from "railway/iac";

export default defineRailway(() => {
  const GenOVA = github("GenOVA-UPAO/GenOVA", { branch: "develop" });

  // Redis-MHGx era un duplicado huerfano (confirmado 2026-07-13: backend y
  // worker apuntan ambos a redis.railway.internal, el servicio "Redis" de
  // abajo — Redis-MHGx no lo referenciaba nadie). Eliminado via IaC.
  const redisVolume = volume("redis-volume", { sizeMB: 500, region: "sfo" });

  const GenOVAWorkerDevelop = service("GenOVA Worker Develop", {
    source: GenOVA,
    replicas: 1,
    networking: { privateNetworkEndpoint: "genova-worker-develop" },
    env: {
      DATABASE_URL: preserve(),
      DB_MAX_OVERFLOW: preserve(),
      DB_POOL_SIZE: preserve(),
      ENV: preserve(),
      FALAI_IMAGE_MODEL: preserve(),
      HF_IMAGE_MODEL: preserve(),
      JWT_ALGORITHM: preserve(),
      JWT_SECRET: preserve(),
      LLM_TIMEOUT_S: preserve(),
      LOG_LEVEL: preserve(),
      OVA_ENGINE: preserve(),
      OVA_GENERATION_DURATION_SECONDS: preserve(),
      OVA_GEN_CONCURRENCY: preserve(),
      OVA_MAX_GENERATED_IMAGES: preserve(),
      RAG_CHUNK_OVERLAP: preserve(),
      RAG_CHUNK_SIZE: preserve(),
      RAG_EMBEDDER: preserve(),
      RAG_MAX_CHUNKS_PER_FILE: preserve(),
      RAG_MAX_CONTEXT_CHARS: preserve(),
      RAG_TOP_K: preserve(),
      RAILWAY_DOCKERFILE_PATH: preserve(),
      REDIS_URL: preserve(),
      RUNWARE_IMAGE_MODEL: preserve(),
      SILICONFLOW_IMAGE_MODEL: preserve(),
      SUPABASE_SERVICE_ROLE_KEY: preserve(),
      SUPABASE_STORAGE_BUCKET: preserve(),
      SUPABASE_URL: preserve(),
    },
  });
  const GenOVABackendDevelop = service("GenOVA Backend Develop", {
    source: GenOVA,
    replicas: 1,
    networking: { privateNetworkEndpoint: "genova-backend-develop" },
    env: {
      APP_URL: preserve(),
      AUTH_ACCEPT_BEARER: preserve(),
      COOKIE_SAMESITE: preserve(),
      CORS_ORIGINS: preserve(),
      DATABASE_URL: preserve(),
      DB_MAX_OVERFLOW: preserve(),
      DB_POOL_SIZE: preserve(),
      ENV: preserve(),
      FALAI_IMAGE_MODEL: preserve(),
      HF_IMAGE_MODEL: preserve(),
      JWT_ALGORITHM: preserve(),
      JWT_EXPIRES_MINUTES: preserve(),
      JWT_SECRET: preserve(),
      LLM_TIMEOUT_S: preserve(),
      LOG_LEVEL: preserve(),
      OVA_ENGINE: preserve(),
      OVA_GENERATION_DURATION_SECONDS: preserve(),
      OVA_GEN_CONCURRENCY: preserve(),
      OVA_MAX_GENERATED_IMAGES: preserve(),
      PORT: preserve(),
      RAG_CHUNK_OVERLAP: preserve(),
      RAG_CHUNK_SIZE: preserve(),
      RAG_EMBEDDER: preserve(),
      RAG_MAX_CHUNKS_PER_FILE: preserve(),
      RAG_MAX_CONTEXT_CHARS: preserve(),
      RAG_TOP_K: preserve(),
      RAILWAY_DOCKERFILE_PATH: preserve(),
      REDIS_URL: preserve(),
      RUNWARE_IMAGE_MODEL: preserve(),
      SILICONFLOW_IMAGE_MODEL: preserve(),
      SMTP_HOST: preserve(),
      SMTP_PASSWORD: preserve(),
      SMTP_PORT: preserve(),
      SMTP_USER: preserve(),
      SUPABASE_SERVICE_ROLE_KEY: preserve(),
      SUPABASE_STORAGE_BUCKET: preserve(),
      SUPABASE_URL: preserve(),
      UPLOAD_MAX_FILES: preserve(),
      UPLOAD_MAX_FILE_SIZE_MB: preserve(),
    },
  });
  const Redis = redis("Redis");

  return project("serene-reverence", {
    resources: [GenOVAWorkerDevelop, GenOVABackendDevelop, Redis, redisVolume],
  });
});
