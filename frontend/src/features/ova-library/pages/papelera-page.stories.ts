import type { Meta, StoryObj } from "@storybook/angular";
import { http, HttpResponse } from "msw";

import { PapeleraPage } from "./papelera-page";

const trashedFixture = {
  ovas: [
    {
      id: "ova-1",
      title: "Fotosíntesis y el Ciclo del Carbono",
      description: "OVA sobre biología celular para 2° año de secundaria.",
      status: "listo",
      deleted_at: "2026-07-01T10:00:00Z",
    },
    {
      id: "ova-2",
      title: "Introducción a la Estadística",
      status: "borrador",
      deleted_at: "2026-06-28T10:00:00Z",
    },
  ],
  total_pages: 1,
  total_items: 2,
};

const meta: Meta<PapeleraPage> = {
  component: PapeleraPage,
  title: "Features/OvaLibrary/Pages/PapeleraPage",
  tags: ["autodocs"],
  parameters: {
    msw: {
      handlers: [http.get("/api/ovas/papelera", () => HttpResponse.json(trashedFixture))],
    },
  },
};
export default meta;

type Story = StoryObj<PapeleraPage>;

export const Default: Story = {};

export const Empty: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get("/api/ovas/papelera", () =>
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
        http.get("/api/ovas/papelera", () =>
          HttpResponse.json({ message: "error" }, { status: 500 }),
        ),
      ],
    },
  },
};
