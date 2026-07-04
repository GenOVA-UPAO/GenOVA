import type { Meta, StoryObj } from "@storybook/angular";
import { http, HttpResponse } from "msw";

import { DashboardPage } from "./dashboard-page";

const ovasFixture = {
  ovas: [
    {
      id: "ova-1",
      title: "Fotosíntesis y el Ciclo del Carbono",
      status: "listo",
      created_at: "2026-06-20T10:00:00Z",
    },
    {
      id: "ova-2",
      title: "Introducción a la Estadística",
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
  total_pages: 1,
  total_items: 3,
};

const meta: Meta<DashboardPage> = {
  component: DashboardPage,
  title: "Features/OvaLibrary/Pages/DashboardPage",
  tags: ["autodocs"],
  parameters: {
    msw: {
      handlers: [http.get("/api/ovas", () => HttpResponse.json(ovasFixture))],
    },
  },
};
export default meta;

type Story = StoryObj<DashboardPage>;

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
