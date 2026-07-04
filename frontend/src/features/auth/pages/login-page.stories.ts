import type { Meta, StoryObj } from "@storybook/angular";

import { LoginPage } from "./login-page";

const meta: Meta<LoginPage> = {
  component: LoginPage,
  title: "Features/Auth/Pages/LoginPage",
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj<LoginPage>;

export const Default: Story = {};
