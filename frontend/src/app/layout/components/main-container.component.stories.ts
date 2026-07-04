import type { Meta, StoryObj } from "@storybook/angular";

import { MainContainerComponent } from "./main-container.component";

const meta: Meta<MainContainerComponent> = {
  component: MainContainerComponent,
  title: "App/MainContainer",
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj<MainContainerComponent>;

export const Default: Story = {};
