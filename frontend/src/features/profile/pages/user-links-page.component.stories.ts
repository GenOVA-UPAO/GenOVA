import type { Meta, StoryObj } from "@storybook/angular";
import { http, HttpResponse } from "msw";

import { UserLinksPageComponent } from "./user-links-page.component";

const meUser = {
  id: "1",
  role: "docente",
  email: "docente@upao.edu.pe",
  full_name: "Docente Demo",
  permissions: ["users:link"],
};

const meta: Meta<UserLinksPageComponent> = {
  component: UserLinksPageComponent,
  title: "Features/Profile/Pages/UserLinksPage",
  tags: ["autodocs"],
  parameters: {
    msw: {
      handlers: [
        http.get("*/api/auth/me", () => HttpResponse.json(meUser)),
        http.get("*/api/users/me/links", () =>
          HttpResponse.json({
            links: [
              {
                id: "1",
                status: "activo",
                linked: { full_name: "Ana Torres", email: "ana@upao.edu.pe" },
              },
              { id: "2", status: "pending", invite_email: "pendiente@upao.edu.pe" },
            ],
          }),
        ),
      ],
    },
  },
};
export default meta;

type Story = StoryObj<UserLinksPageComponent>;

export const Default: Story = {};

export const Empty: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get("*/api/auth/me", () => HttpResponse.json(meUser)),
        http.get("*/api/users/me/links", () => HttpResponse.json({ links: [] })),
      ],
    },
  },
};

export const NoLinkPermissions: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get("*/api/auth/me", () =>
          HttpResponse.json({ ...meUser, role: "estudiante", permissions: [] }),
        ),
      ],
    },
  },
};
