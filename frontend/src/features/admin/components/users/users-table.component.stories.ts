import type { Meta, StoryObj } from "@storybook/angular";

import type { AdminUser, Role } from "../../lib/types";
import { type Handlers, UsersTableComponent } from "./users-table.component";

const noopHandlers: Handlers = {
  handleRoleChange: () => {
    /* no-op for Storybook */
  },
  handleToggleStatus: () => {
    /* no-op for Storybook */
  },
  handleUnlockUser: () => {
    /* no-op for Storybook */
  },
  handleSendResetEmail: () => {
    /* no-op for Storybook */
  },
  runWhatsAppReset: async () => {
    /* no-op for Storybook */
  },
  openEdit: () => {
    /* no-op for Storybook */
  },
};

const roles: Role[] = [
  { id: "role-1", name: "administrador", user_count: 2 },
  { id: "role-2", name: "profesor", user_count: 8 },
  { id: "role-3", name: "estudiante", user_count: 40 },
];

const users: AdminUser[] = [
  {
    id: "user-1",
    full_name: "Ana Torres",
    email: "ana.torres@upao.edu.pe",
    is_active: true,
    role: { id: "role-2", name: "profesor" },
    university_id: 257022,
    phone_number: "+51987285992",
  },
  {
    id: "user-2",
    email: "sin.nombre@upao.edu.pe",
    is_active: false,
    role: { id: "role-3", name: "estudiante" },
  },
  {
    id: "user-3",
    full_name: "Luis Pérez",
    email: "luis.perez@upao.edu.pe",
    is_active: true,
    role: { id: "role-1", name: "administrador" },
    locked_until: new Date(Date.now() + 1000 * 60 * 30).toISOString(),
  },
];

const meta: Meta<UsersTableComponent> = {
  component: UsersTableComponent,
  title: "Features/Admin/Users/UsersTable",
  tags: ["autodocs"],
  args: {
    users,
    roles,
    currentUser: users[0],
    updatingUserId: "",
    handlers: noopHandlers,
    searchQuery: "",
  },
};
export default meta;

type Story = StoryObj<UsersTableComponent>;

export const Default: Story = {};

export const Empty: Story = {
  args: {
    users: [],
    searchQuery: "",
  },
};

export const EmptyWithSearch: Story = {
  args: {
    users: [],
    searchQuery: "xyz",
  },
};

export const UpdatingRow: Story = {
  args: {
    updatingUserId: "user-1",
  },
};
