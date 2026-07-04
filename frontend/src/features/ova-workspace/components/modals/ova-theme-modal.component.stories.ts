import type { Meta, StoryObj } from "@storybook/angular";

import { OvaThemeModalComponent } from "./ova-theme-modal.component";

const meta: Meta<OvaThemeModalComponent> = {
  component: OvaThemeModalComponent,
  title: "Features/OvaWorkspace/Modals/OvaThemeModal",
  tags: ["autodocs"],
  args: {
    open: true,
    theme: { color: "upao", design: "upao" },
  },
};
export default meta;

type Story = StoryObj<OvaThemeModalComponent>;

export const Upao: Story = {};

export const Free: Story = {
  args: {
    theme: { color: "free", design: "free" },
  },
};

export const Mixed: Story = {
  args: {
    theme: { color: "upao", design: "free" },
  },
};
