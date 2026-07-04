import type { Meta, StoryObj } from "@storybook/angular";
import { http, HttpResponse } from "msw";

import { PlatformNodesCardComponent } from "./platform-nodes-card.component";

const sampleNodes = [
  {
    id: "critic",
    flag: "enable_critic",
    name: "Crítico",
    role: "QA",
    description: "Revisa y puntúa el borrador antes de continuar.",
    always_on: false,
    configurable: true,
    param: { label: "Rondas", min: 1, max: 3 },
  },
  {
    id: "planner",
    flag: "enable_planner",
    name: "Planificador",
    role: "Orquestación",
    description: "Descompone el pedido en tareas para los demás nodos.",
    always_on: false,
    configurable: true,
  },
  {
    id: "writer",
    name: "Redactor",
    description: "Genera el contenido textual base del OVA.",
    always_on: true,
  },
  {
    id: "video",
    name: "Video",
    description: "Genera clips de video para el OVA.",
    always_on: true,
  },
];

const meta: Meta<PlatformNodesCardComponent> = {
  component: PlatformNodesCardComponent,
  title: "Features/LlmSettings/PlatformNodesCard",
  tags: ["autodocs"],
  parameters: {
    msw: {
      handlers: [
        http.get("/api/admin/nodes-config", () =>
          HttpResponse.json({
            nodes: sampleNodes,
            config: {
              enable_critic: "1",
              enable_planner: "1",
              ova_reflection_rounds: "2",
            },
            video_api_key_configured: true,
          }),
        ),
      ],
    },
  },
};
export default meta;

type Story = StoryObj<PlatformNodesCardComponent>;

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
          HttpResponse.json(
            { detail: "No se pudo cargar la configuración de nodos." },
            { status: 500 },
          ),
        ),
      ],
    },
  },
};

export const VideoKeyMissing: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get("/api/admin/nodes-config", () =>
          HttpResponse.json({
            nodes: sampleNodes,
            config: {
              enable_critic: "1",
              enable_planner: "1",
              ova_reflection_rounds: "1",
            },
            video_api_key_configured: false,
          }),
        ),
      ],
    },
  },
};
