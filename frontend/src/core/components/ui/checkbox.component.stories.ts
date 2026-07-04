import type { Meta, StoryObj } from "@storybook/angular";

import { CheckboxComponent } from "./checkbox.component";

const meta: Meta<CheckboxComponent> = {
  component: CheckboxComponent,
  title: "UI/Checkbox",
  tags: ["autodocs"],
  args: {
    checked: false,
    disabled: false,
  },
  render: (args) => ({
    props: args,
    template: `<gn-checkbox [checked]="checked" [disabled]="disabled" />`,
  }),
};
export default meta;

type Story = StoryObj<CheckboxComponent>;

export const Default: Story = {};

export const Checked: Story = {
  args: { checked: true },
};

export const Disabled: Story = {
  args: { disabled: true },
};
