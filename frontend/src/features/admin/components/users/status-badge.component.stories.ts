import type { Meta, StoryObj } from "@storybook/angular";

import { UserStatusBadgeComponent } from "./status-badge.component";

const meta: Meta<UserStatusBadgeComponent> = {
  component: UserStatusBadgeComponent,
  title: "Features/Admin/Users/StatusBadge",
  tags: ["autodocs"],
  args: {
    user: {
      id: "user-1",
      email: "activo@upao.edu.pe",
      is_active: true,
    },
  },
};
export default meta;

type Story = StoryObj<UserStatusBadgeComponent>;

export const Active: Story = {};

export const Inactive: Story = {
  args: {
    user: {
      id: "user-2",
      email: "inactivo@upao.edu.pe",
      is_active: false,
    },
  },
};

export const Locked: Story = {
  args: {
    user: {
      id: "user-3",
      email: "bloqueado@upao.edu.pe",
      is_active: true,
      locked_until: new Date(Date.now() + 1000 * 60 * 30).toISOString(),
    },
  },
};
