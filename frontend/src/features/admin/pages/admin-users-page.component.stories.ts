import type { Meta, StoryObj } from "@storybook/angular";
import { http, HttpResponse } from "msw";

import { AdminUsersPageComponent } from "./admin-users-page.component";

const currentUser = {
  id: "user-1",
  full_name: "Ana Torres",
  email: "ana.torres@upao.edu.pe",
  is_active: true,
  role: { id: "role-1", name: "administrador" },
};

const rolesResponse = [
  { id: "role-1", name: "administrador", user_count: 2 },
  { id: "role-2", name: "profesor", user_count: 8 },
  { id: "role-3", name: "estudiante", user_count: 40 },
];

const usersResponse = {
  users: [
    currentUser,
    {
      id: "user-2",
      full_name: "Luis Pérez",
      email: "luis.perez@upao.edu.pe",
      is_active: true,
      role: { id: "role-2", name: "profesor" },
      university_id: 257022,
      phone_number: "+51987285992",
    },
    {
      id: "user-3",
      email: "sin.nombre@upao.edu.pe",
      is_active: false,
      role: { id: "role-3", name: "estudiante" },
    },
  ],
  total_pages: 1,
  total_items: 3,
};

const meta: Meta<AdminUsersPageComponent> = {
  component: AdminUsersPageComponent,
  title: "Features/Admin/Pages/AdminUsersPage",
  tags: ["autodocs"],
  parameters: {
    msw: {
      handlers: [
        http.get("/api/users/", () => HttpResponse.json(usersResponse)),
        http.get("/api/roles", () => HttpResponse.json(rolesResponse)),
        http.get("/api/auth/me", () => HttpResponse.json(currentUser)),
      ],
    },
  },
};
export default meta;

type Story = StoryObj<AdminUsersPageComponent>;

export const Default: Story = {};

export const Empty: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get("/api/users/", () =>
          HttpResponse.json({ users: [], total_pages: 1, total_items: 0 }),
        ),
        http.get("/api/roles", () => HttpResponse.json(rolesResponse)),
        http.get("/api/auth/me", () => HttpResponse.json(currentUser)),
      ],
    },
  },
};

export const LoadError: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get("/api/users/", () => new HttpResponse(null, { status: 500 })),
        http.get("/api/roles", () => HttpResponse.json(rolesResponse)),
        http.get("/api/auth/me", () => HttpResponse.json(currentUser)),
      ],
    },
  },
};
