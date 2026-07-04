import type { Meta, StoryObj } from "@storybook/angular";

import { SkeletonComponent } from "./skeleton.component";

const meta: Meta<SkeletonComponent> = {
  component: SkeletonComponent,
  title: "UI/Skeleton",
  tags: ["autodocs"],
  args: {
    width: "16rem",
    height: "1rem",
    radius: "6px",
  },
  render: (args) => ({
    props: args,
    template: `<gn-skeleton [width]="width" [height]="height" [radius]="radius" />`,
  }),
};
export default meta;

type Story = StoryObj<SkeletonComponent>;

export const Default: Story = {};

export const Circle: Story = {
  args: { width: "3rem", height: "3rem", radius: "9999px" },
};
