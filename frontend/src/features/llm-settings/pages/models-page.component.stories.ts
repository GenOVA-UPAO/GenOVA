import type { Meta, StoryObj } from "@storybook/angular";
import { http, HttpResponse } from "msw";

import { ModelsPageComponent } from "./models-page.component";

const sampleCatalogModel = {
  provider: "groq",
  model_id: "llama-3.3-70b-versatile",
  label: "Llama 3.3 70B",
  curated: true,
  modality: "text",
  category: "texto",
  context_length: 128_000,
};

const llmSettingsResponse = {
  settings: {
    texto: {
      provider: "groq",
      model_id: "llama-3.3-70b-versatile",
      timeout_s: 120,
      fallbacks: [],
    },
  },
  has_own_llm_key: false,
  catalog: { texto: [sampleCatalogModel] },
  catalog_all: [sampleCatalogModel],
  enabled_models: [{ provider: "groq", model_id: "llama-3.3-70b-versatile" }],
  defaults: { texto: { provider: "groq", model_id: "llama-3.3-70b-versatile" } },
  timeout_bounds: [30, 300],
  catalog_full: [sampleCatalogModel],
  full_total: 1,
  full_page: 1,
  full_has_more: false,
  categories: ["texto", "codigo"],
  types: ["texto"],
  catalog_status: {},
};

const adminLlmConfigResponse = {
  tasks: ["texto", "codigo", "orquestador", "razonamiento"],
  catalog: [sampleCatalogModel],
  config: {
    texto: { default: { provider: "groq", model_id: "llama-3.3-70b-versatile" }, fallbacks: [] },
  },
};

const commonHandlers = [
  http.get("/api/users/me/llm-settings", () => HttpResponse.json(llmSettingsResponse)),
  http.get("/api/admin/llm-config", () => HttpResponse.json(adminLlmConfigResponse)),
  http.get("/api/admin/nodes-config", () =>
    HttpResponse.json({
      nodes: [],
      capabilities: [],
      config: {},
      video_api_key_configured: true,
    }),
  ),
  http.get("/api/admin/platform-config", () =>
    HttpResponse.json({ platform_config: {}, providers: ["groq", "openrouter"] }),
  ),
  http.get("/api/users/me/api-keys", () => HttpResponse.json({ api_keys: {} })),
];

const meta: Meta<ModelsPageComponent> = {
  component: ModelsPageComponent,
  title: "Features/LlmSettings/Pages/ModelsPage",
  tags: ["autodocs"],
  parameters: {
    msw: {
      handlers: [
        http.get("/api/auth/me", () =>
          HttpResponse.json({
            id: 1,
            role: "administrador",
            email: "admin@genova.ai",
            full_name: "Admin GenOVA",
            permissions: ["ai:models:platform"],
          }),
        ),
        ...commonHandlers,
      ],
    },
  },
};
export default meta;

type Story = StoryObj<ModelsPageComponent>;

export const AdminView: Story = {};

export const NonAdminView: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get("/api/auth/me", () =>
          HttpResponse.json({
            id: 2,
            role: "docente",
            email: "user@genova.ai",
            full_name: "Docente GenOVA",
            permissions: ["ai:models:self"],
          }),
        ),
        ...commonHandlers,
      ],
    },
  },
};
