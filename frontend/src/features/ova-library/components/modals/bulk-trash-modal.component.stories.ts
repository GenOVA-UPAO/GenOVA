import type { Meta, StoryObj } from "@storybook/angular";

import { BulkTrashModalComponent } from "./bulk-trash-modal.component";

const meta: Meta<BulkTrashModalComponent> = {
  component: BulkTrashModalComponent,
  title: "Features/OvaLibrary/BulkTrashModal",
  tags: ["autodocs"],
  args: {
    count: 3,
    isLoading: false,
  },
};
export default meta;

type Story = StoryObj<BulkTrashModalComponent>;

export const Default: Story = {};

export const Loading: Story = {
  args: { isLoading: true },
};

export const SingleItem: Story = {
  args: { count: 1 },
};
