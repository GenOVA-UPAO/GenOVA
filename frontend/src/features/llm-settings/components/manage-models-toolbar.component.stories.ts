import type { Meta, StoryObj } from "@storybook/angular";

import { ManageModelsToolbarComponent } from "./manage-models-toolbar.component";

const meta: Meta<ManageModelsToolbarComponent> = {
  component: ManageModelsToolbarComponent,
  title: "Features/LlmSettings/ManageModelsToolbar",
  tags: ["autodocs"],
  args: {
    localSearch: "",
    categoryFilter: "all",
    categories: ["all", "groq", "openrouter", "huggingface"],
  },
};
export default meta;

type Story = StoryObj<ManageModelsToolbarComponent>;

export const Default: Story = {};

export const WithSearchTerm: Story = {
  args: { localSearch: "claude" },
};

export const FilteredByCategory: Story = {
  args: { categoryFilter: "openrouter" },
};
