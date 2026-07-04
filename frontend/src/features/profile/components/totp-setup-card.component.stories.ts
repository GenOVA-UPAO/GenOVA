import type { Meta, StoryObj } from "@storybook/angular";

import { TotpSetupCardComponent } from "./totp-setup-card.component";

const meta: Meta<TotpSetupCardComponent> = {
  component: TotpSetupCardComponent,
  title: "Features/Profile/TotpSetupCard",
  tags: ["autodocs"],
  args: {
    totpEnabled: false,
  },
};
export default meta;

type Story = StoryObj<TotpSetupCardComponent>;

export const Idle: Story = {};

export const Enabled: Story = {
  args: { totpEnabled: true },
};
