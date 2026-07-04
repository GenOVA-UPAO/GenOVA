import type { Meta, StoryObj } from "@storybook/angular";

import { TotpLoginStepComponent } from "./totp-login-step.component";

const meta: Meta<TotpLoginStepComponent> = {
  component: TotpLoginStepComponent,
  title: "Features/Auth/TotpLoginStep",
  tags: ["autodocs"],
  args: {
    ticket: "demo-ticket-123",
  },
};
export default meta;

type Story = StoryObj<TotpLoginStepComponent>;

export const Default: Story = {};
