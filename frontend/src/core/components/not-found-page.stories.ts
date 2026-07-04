import type { Meta, StoryObj } from "@storybook/angular";

import { NotFoundPage } from "./not-found-page";

const meta: Meta<NotFoundPage> = {
  component: NotFoundPage,
  title: "Core/NotFoundPage",
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj<NotFoundPage>;

export const Default: Story = {};
