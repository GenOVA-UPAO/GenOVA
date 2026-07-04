import type { Meta, StoryObj } from "@storybook/angular";

import { ConnectProviderModalComponent } from "./connect-provider-modal.component";

const meta: Meta<ConnectProviderModalComponent> = {
  component: ConnectProviderModalComponent,
  title: "Features/LlmSettings/ConnectProviderModal",
  tags: ["autodocs"],
  args: {
    open: true,
  },
};
export default meta;

type Story = StoryObj<ConnectProviderModalComponent>;

export const Default: Story = {};

export const Closed: Story = {
  args: { open: false },
};
