import type { Meta, StoryObj } from "@storybook/angular";

import { PlatformKeyRowComponent } from "./platform-key-row.component";

const meta: Meta<PlatformKeyRowComponent> = {
  component: PlatformKeyRowComponent,
  title: "Features/LlmSettings/PlatformKeyRow",
  tags: ["autodocs"],
  args: {
    provider: "groq",
    maskedValue: "gsk_...abcd",
  },
};
export default meta;

type Story = StoryObj<PlatformKeyRowComponent>;

export const Configured: Story = {};

export const NotConfigured: Story = {
  args: { maskedValue: undefined },
};

export const UnknownProvider: Story = {
  args: { provider: "custom-provider", maskedValue: undefined },
};
