import type { Meta, StoryObj } from "@storybook/angular";

import { BadgeComponent } from "./badge.component";

const meta: Meta<BadgeComponent> = {
  component: BadgeComponent,
  title: "UI/Badge",
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: ["default", "secondary", "destructive", "outline", "success", "warning"],
    },
  },
  args: {
    variant: "default",
  },
  render: (args) => ({
    props: args,
    template: `<gn-badge [variant]="variant">Etiqueta</gn-badge>`,
  }),
};
export default meta;

type Story = StoryObj<BadgeComponent>;

export const Default: Story = {};

export const Success: Story = {
  args: { variant: "success" },
};

export const Warning: Story = {
  args: { variant: "warning" },
};

export const Destructive: Story = {
  args: { variant: "destructive" },
};
