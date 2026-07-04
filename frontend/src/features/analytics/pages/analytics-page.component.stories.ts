import type { Meta, StoryObj } from "@storybook/angular";
import { http, HttpResponse } from "msw";

import { AnalyticsPageComponent } from "./analytics-page.component";

const analyticsResponse = {
  scope: "platform",
  totals: { ovas: 128, users: 340 },
  ova_by_status: { listo: 60, generando: 15, borrador: 40, error: 13 },
  top_creators: [
    { user_id: "user-1", name: "Ana Torres", email: "ana.torres@upao.edu.pe", ova_count: 14 },
    { user_id: "user-2", name: "Luis Pérez", email: "luis.perez@upao.edu.pe", ova_count: 9 },
  ],
  recent_ovas: [
    {
      id: "ova-1",
      title: "Introducción a la Termodinámica",
      owner_name: "Ana Torres",
      status: "listo",
      created_at: new Date().toISOString(),
    },
    {
      id: "ova-2",
      title: "Estructuras de Datos Avanzadas",
      owner_name: "Luis Pérez",
      status: "generando",
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    },
  ],
};

const meta: Meta<AnalyticsPageComponent> = {
  component: AnalyticsPageComponent,
  title: "Features/Analytics/Pages/AnalyticsPage",
  tags: ["autodocs"],
  parameters: {
    msw: {
      handlers: [http.get("/api/users/analytics", () => HttpResponse.json(analyticsResponse))],
    },
  },
};
export default meta;

type Story = StoryObj<AnalyticsPageComponent>;

export const Default: Story = {};

export const CohortScope: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get("/api/users/analytics", () =>
          HttpResponse.json({
            ...analyticsResponse,
            scope: "docente",
            totals: { ovas: 24, students: 56 },
          }),
        ),
      ],
    },
  },
};

export const LoadError: Story = {
  parameters: {
    msw: {
      handlers: [http.get("/api/users/analytics", () => new HttpResponse(null, { status: 500 }))],
    },
  },
};
