import type { Meta, StoryObj } from "@storybook/angular";
import { http, HttpResponse } from "msw";

import { MisOvasPage } from "./mis-ovas-page";

const ovasFixture = {
  ovas: [
    {
      id: "ova-1",
      title: "Fotosíntesis y el Ciclo del Carbono",
      description: "OVA sobre biología celular para 2° año de secundaria.",
      status: "listo",
      version_number: 2,
      created_at: "2026-06-20T10:00:00Z",
    },
    {
      id: "ova-2",
      title: "Introducción a la Estadística",
      description: "Medidas de tendencia central y dispersión.",
      status: "generando",
      created_at: "2026-07-01T10:00:00Z",
    },
    {
      id: "ova-3",
      title: "Química Orgánica Básica",
      status: "borrador",
      created_at: "2026-07-02T10:00:00Z",
    },
  ],
  total_pages: 2,
  total_items: 15,
};

const baseHandlers = [
  http.get("/api/ovas", () => HttpResponse.json(ovasFixture)),
  http.get("/api/ova/jobs", () => HttpResponse.json({ status: 404 }, { status: 404 })),
];

const meta: Meta<MisOvasPage> = {
  component: MisOvasPage,
  title: "Features/OvaLibrary/Pages/MisOvasPage",
  tags: ["autodocs"],
  parameters: {
    msw: { handlers: baseHandlers },
  },
};
export default meta;

type Story = StoryObj<MisOvasPage>;

export const Default: Story = {};

export const Empty: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get("/api/ovas", () =>
          HttpResponse.json({ ovas: [], total_pages: 1, total_items: 0 }),
        ),
      ],
    },
  },
};

export const LoadingError: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get("/api/ovas", () => HttpResponse.json({ message: "error" }, { status: 500 })),
      ],
    },
  },
};
