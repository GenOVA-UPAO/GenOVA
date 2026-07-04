import type { Meta, StoryObj } from "@storybook/angular";

import { OvaThemeSelectorComponent } from "./ova-theme-selector.component";

const meta: Meta<OvaThemeSelectorComponent> = {
  component: OvaThemeSelectorComponent,
  title: "Features/OvaWorkspace/Modals/OvaThemeSelector",
  tags: ["autodocs"],
  args: {
    theme: { color: "upao", design: "upao" },
    disabled: false,
  },
};
export default meta;

type Story = StoryObj<OvaThemeSelectorComponent>;

export const Upao: Story = {};

export const Free: Story = {
  args: {
    theme: { color: "free", design: "free" },
  },
};

export const Mixed: Story = {
  args: {
    theme: { color: "free", design: "upao" },
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
  },
};
