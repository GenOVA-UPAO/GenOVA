import type { Meta, StoryObj } from "@storybook/angular";

import { PasswordChangeFormComponent } from "./password-change-form.component";

const meta: Meta<PasswordChangeFormComponent> = {
  component: PasswordChangeFormComponent,
  title: "Features/Profile/PasswordChangeForm",
  tags: ["autodocs"],
  args: {
    isSubmitting: false,
  },
};
export default meta;

type Story = StoryObj<PasswordChangeFormComponent>;

export const Default: Story = {};

export const Submitting: Story = {
  args: { isSubmitting: true },
};
