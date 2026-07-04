import type { Meta, StoryObj } from "@storybook/angular";

import { OvaStatusBadgeComponent } from "./ova-status-badge.component";

const meta: Meta<OvaStatusBadgeComponent> = {
  component: OvaStatusBadgeComponent,
  title: "Core/OvaStatusBadge",
  tags: ["autodocs"],
  argTypes: {
    status: {
      control: "select",
      options: [undefined, "generando", "error", "listo"],
    },
  },
  args: {
    status: "listo",
  },
};
export default meta;

type Story = StoryObj<OvaStatusBadgeComponent>;

export const Listo: Story = {};

export const Generando: Story = {
  args: { status: "generando" },
};

export const Error: Story = {
  args: { status: "error" },
};

export const Borrador: Story = {
  args: { status: undefined },
};
