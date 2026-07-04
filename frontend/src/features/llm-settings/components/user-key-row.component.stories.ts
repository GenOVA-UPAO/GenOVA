import type { Meta, StoryObj } from "@storybook/angular";

import { UserKeyRowComponent } from "./user-key-row.component";

const meta: Meta<UserKeyRowComponent> = {
  component: UserKeyRowComponent,
  title: "Features/LlmSettings/UserKeyRow",
  tags: ["autodocs"],
  args: {
    provider: "groq",
    maskedValue: "gsk_...abcd",
  },
};
export default meta;

type Story = StoryObj<UserKeyRowComponent>;

export const Configured: Story = {};

export const NotConfigured: Story = {
  args: { maskedValue: undefined },
};

export const UnknownProvider: Story = {
  args: { provider: "custom-provider", maskedValue: undefined },
};
