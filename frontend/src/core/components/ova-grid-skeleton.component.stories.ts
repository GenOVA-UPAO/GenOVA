import type { Meta, StoryObj } from "@storybook/angular";

import { OvaGridSkeletonComponent } from "./ova-grid-skeleton.component";

const meta: Meta<OvaGridSkeletonComponent> = {
  component: OvaGridSkeletonComponent,
  title: "Core/OvaGridSkeleton",
  tags: ["autodocs"],
  args: {
    count: 6,
  },
};
export default meta;

type Story = StoryObj<OvaGridSkeletonComponent>;

export const Default: Story = {};

export const FewCards: Story = {
  args: { count: 2 },
};
