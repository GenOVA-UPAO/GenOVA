import type { Meta, StoryObj } from "@storybook/angular";

import { AppComponent } from "./app";

const meta: Meta<AppComponent> = {
  component: AppComponent,
  title: "App/App",
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj<AppComponent>;

export const Default: Story = {};
