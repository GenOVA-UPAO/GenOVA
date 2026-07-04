import type { Meta, StoryObj } from "@storybook/angular";
import { http, HttpResponse } from "msw";

import { ThemeModalComponent } from "./theme-modal.component";

const meta: Meta<ThemeModalComponent> = {
  component: ThemeModalComponent,
  title: "Features/OvaLibrary/ThemeModal",
  tags: ["autodocs"],
  args: {
    initialTheme: { colorMode: "upao", designMode: "upao", palette: null },
  },
  parameters: {
    msw: {
      handlers: [http.patch("/api/users/me/theme", () => HttpResponse.json({ ok: true }))],
    },
  },
};
export default meta;

type Story = StoryObj<ThemeModalComponent>;

export const Default: Story = {};

export const CustomPalette: Story = {
  args: {
    initialTheme: {
      colorMode: "custom",
      designMode: "upao",
      palette: { name: "Oceano", p: "#164E63", a: "#38BDF8" },
    },
  },
};

export const AiChoice: Story = {
  args: {
    initialTheme: { colorMode: "ai", designMode: "ai", palette: null },
  },
};

export const SaveError: Story = {
  parameters: {
    msw: {
      handlers: [
        http.patch("/api/users/me/theme", () =>
          HttpResponse.json({ message: "No se pudo conectar con el servidor." }, { status: 500 }),
        ),
      ],
    },
  },
};
