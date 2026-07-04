import type { Meta, StoryObj } from "@storybook/angular";

import { ForgotPasswordPage } from "./forgot-password-page";

const meta: Meta<ForgotPasswordPage> = {
  component: ForgotPasswordPage,
  title: "Features/Auth/Pages/ForgotPasswordPage",
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj<ForgotPasswordPage>;

export const Default: Story = {};
