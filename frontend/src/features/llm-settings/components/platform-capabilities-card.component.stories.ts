import type { Meta, StoryObj } from "@storybook/angular";
import { http, HttpResponse } from "msw";

import { PlatformCapabilitiesCardComponent } from "./platform-capabilities-card.component";

const sampleCapabilities = [
  {
    id: "rag",
    flag: "enable_rag",
    name: "RAG",
    role: "Contexto",
    description: "Recuperación aumentada por vectores para el contenido del OVA.",
    always_on: false,
    configurable: true,
    default: "1",
  },
  {
    id: "video",
    flag: "enable_video",
    name: "Generación de video",
    role: "Media",
    description: "Clips generados vía proveedor externo de video.",
    always_on: false,
    configurable: true,
    default: "0",
  },
  {
    id: "scorm",
    flag: "enable_scorm",
    name: "Export SCORM",
    description: "Empaquetado SCORM 1.2 siempre disponible.",
    always_on: true,
    configurable: false,
    default: "1",
  },
];

const meta: Meta<PlatformCapabilitiesCardComponent> = {
  component: PlatformCapabilitiesCardComponent,
  title: "Features/LlmSettings/PlatformCapabilitiesCard",
  tags: ["autodocs"],
  parameters: {
    msw: {
      handlers: [
        http.get("/api/admin/nodes-config", () =>
          HttpResponse.json({
            capabilities: sampleCapabilities,
            config: { enable_rag: "1", enable_video: "0", enable_scorm: "1" },
            video_api_key_configured: false,
          }),
        ),
      ],
    },
  },
};
export default meta;

type Story = StoryObj<PlatformCapabilitiesCardComponent>;

export const Default: Story = {};

export const Loading: Story = {
  parameters: {
    msw: {
      handlers: [http.get("/api/admin/nodes-config", () => new Promise(() => undefined))],
    },
  },
};

export const ErrorState: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get("/api/admin/nodes-config", () =>
          HttpResponse.json({ detail: "No se pudo cargar la configuración." }, { status: 500 }),
        ),
      ],
    },
  },
};

export const VideoKeyConfigured: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get("/api/admin/nodes-config", () =>
          HttpResponse.json({
            capabilities: sampleCapabilities,
            config: { enable_rag: "1", enable_video: "1", enable_scorm: "1" },
            video_api_key_configured: true,
          }),
        ),
      ],
    },
  },
};
