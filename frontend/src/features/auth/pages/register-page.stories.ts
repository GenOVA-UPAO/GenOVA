import type { Meta, StoryObj } from "@storybook/angular";

import { RegisterPage } from "./register-page";

const meta: Meta<RegisterPage> = {
  component: RegisterPage,
  title: "Features/Auth/Pages/RegisterPage",
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj<RegisterPage>;

export const Default: Story = {};
