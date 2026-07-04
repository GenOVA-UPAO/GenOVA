import type { Meta, StoryObj } from "@storybook/angular";

import { NavIconComponent } from "./nav-icon.component";

const meta: Meta<NavIconComponent> = {
  component: NavIconComponent,
  title: "App/NavIcon",
  tags: ["autodocs"],
  argTypes: {
    name: {
      control: "select",
      options: ["house", "folder", "plus", "chart", "trash", "gear", "link", "shield", "users"],
    },
  },
  args: {
    name: "house",
    size: 18,
  },
};
export default meta;

type Story = StoryObj<NavIconComponent>;

export const Default: Story = {};

export const Large: Story = {
  args: { name: "chart", size: 32 },
};

export const UnknownIcon: Story = {
  args: { name: "unknown-icon" },
};
