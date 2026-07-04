import type { Meta, StoryObj } from "@storybook/angular";

import { UserActionMenuComponent } from "./user-action-menu.component";

const meta: Meta<UserActionMenuComponent> = {
  component: UserActionMenuComponent,
  title: "Features/Admin/Users/UserActionMenu",
  tags: ["autodocs"],
  args: {
    user: {
      id: "user-1",
      full_name: "Ana Torres",
      email: "ana.torres@upao.edu.pe",
      is_active: true,
      role: { id: "role-2", name: "estudiante" },
      phone_number: "+51987285992",
    },
  },
};
export default meta;

type Story = StoryObj<UserActionMenuComponent>;

export const Default: Story = {};

export const InactiveUser: Story = {
  args: {
    user: {
      id: "user-2",
      full_name: "Luis Pérez",
      email: "luis.perez@upao.edu.pe",
      is_active: false,
    },
  },
};

export const LockedNoPhone: Story = {
  args: {
    user: {
      id: "user-3",
      full_name: "María Ríos",
      email: "maria.rios@upao.edu.pe",
      is_active: true,
      locked_until: new Date(Date.now() + 1000 * 60 * 30).toISOString(),
    },
  },
};
