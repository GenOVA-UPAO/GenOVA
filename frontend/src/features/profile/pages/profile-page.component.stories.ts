import type { Meta, StoryObj } from "@storybook/angular";
import { http, HttpResponse } from "msw";

import { ProfilePageComponent } from "./profile-page.component";

const baseProfile = {
  full_name: "Ana Torres",
  email: "ana.torres@upao.edu.pe",
  university_id: "257022",
  gender: "femenino",
  phone_number: "+51987654321",
  role: "estudiante",
  created_at: "2025-03-01T00:00:00.000Z",
  totp_enabled: false,
};

const meta: Meta<ProfilePageComponent> = {
  component: ProfilePageComponent,
  title: "Features/Profile/Pages/ProfilePage",
  tags: ["autodocs"],
  parameters: {
    msw: {
      handlers: [
        http.get("*/api/auth/me", () => HttpResponse.json(baseProfile)),
        http.get("*/api/admin/platform-config", () => HttpResponse.json({ providers: [] })),
      ],
    },
  },
};
export default meta;

type Story = StoryObj<ProfilePageComponent>;

export const Default: Story = {};

export const Admin: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get("*/api/auth/me", () =>
          HttpResponse.json({ ...baseProfile, role: "administrador" }),
        ),
        http.get("*/api/admin/platform-config", () => HttpResponse.json({ providers: [] })),
      ],
    },
  },
};

export const TotpEnabled: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get("*/api/auth/me", () => HttpResponse.json({ ...baseProfile, totp_enabled: true })),
        http.get("*/api/admin/platform-config", () => HttpResponse.json({ providers: [] })),
      ],
    },
  },
};
