import type { Meta, StoryObj } from "@storybook/angular";

import { LinkRowComponent } from "./link-row.component";

const meta: Meta<LinkRowComponent> = {
  component: LinkRowComponent,
  title: "Core/LinkRow",
  tags: ["autodocs"],
  args: {
    link: {
      id: "1",
      status: "activo",
      linked: { full_name: "Ana Torres", email: "ana@upao.edu.pe" },
    },
    admin: false,
    isOwner: true,
  },
};
export default meta;

type Story = StoryObj<LinkRowComponent>;

export const Active: Story = {};

export const Pending: Story = {
  args: {
    link: { id: "2", status: "pending", invite_email: "pendiente@upao.edu.pe" },
  },
};

export const AdminView: Story = {
  args: {
    admin: true,
    isOwner: false,
    link: {
      id: "3",
      status: "activo",
      linked: { full_name: "Luis Pérez", email: "luis@upao.edu.pe" },
      owner: { email: "owner@upao.edu.pe" },
    },
  },
};
