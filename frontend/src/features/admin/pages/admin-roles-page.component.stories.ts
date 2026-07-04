import type { Meta, StoryObj } from "@storybook/angular";
import { http, HttpResponse } from "msw";

import { AdminRolesPageComponent } from "./admin-roles-page.component";

const rolesResponse = [
  {
    id: "role-1",
    name: "administrador",
    description: "Acceso total a la plataforma.",
    user_count: 2,
    permissions: ["admin:users", "admin:roles", "admin:settings"],
  },
  {
    id: "role-2",
    name: "profesor",
    description: "Puede crear y gestionar sus propios OVAs.",
    user_count: 8,
    permissions: ["ova:create", "ova:edit", "ova:view"],
  },
  {
    id: "role-3",
    name: "estudiante",
    description: "",
    user_count: 40,
    permissions: [],
  },
];

const meta: Meta<AdminRolesPageComponent> = {
  component: AdminRolesPageComponent,
  title: "Features/Admin/Pages/AdminRolesPage",
  tags: ["autodocs"],
  parameters: {
    msw: {
      handlers: [
        http.get("/api/roles", () => HttpResponse.json(rolesResponse)),
        http.get("/api/admin/registration-mode", () =>
          HttpResponse.json({ default_registration_role: "usuarios_prueba" }),
        ),
      ],
    },
  },
};
export default meta;

type Story = StoryObj<AdminRolesPageComponent>;

export const Default: Story = {};

export const Empty: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get("/api/roles", () => HttpResponse.json([])),
        http.get("/api/admin/registration-mode", () =>
          HttpResponse.json({ default_registration_role: "usuario" }),
        ),
      ],
    },
  },
};

export const LoadError: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get("/api/roles", () => new HttpResponse(null, { status: 500 })),
        http.get("/api/admin/registration-mode", () =>
          HttpResponse.json({ default_registration_role: "usuario" }),
        ),
      ],
    },
  },
};
