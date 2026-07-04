import type { Meta, StoryObj } from "@storybook/angular";

import { OvaListPaginationComponent } from "./ova-list-pagination.component";

const meta: Meta<OvaListPaginationComponent> = {
  component: OvaListPaginationComponent,
  title: "Features/OvaLibrary/OvaListPagination",
  tags: ["autodocs"],
  args: {
    currentPage: 1,
    totalPages: 5,
  },
};
export default meta;

type Story = StoryObj<OvaListPaginationComponent>;

export const Default: Story = {};

export const MiddlePage: Story = {
  args: { currentPage: 3, totalPages: 5 },
};

export const LastPage: Story = {
  args: { currentPage: 5, totalPages: 5 },
};

export const SinglePage: Story = {
  args: { currentPage: 1, totalPages: 1 },
};
