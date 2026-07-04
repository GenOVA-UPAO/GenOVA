import type { Meta, StoryObj } from "@storybook/angular";

import { ModelCatalogFilterRowComponent } from "./model-catalog-filter-row.component";

const meta: Meta<ModelCatalogFilterRowComponent> = {
  component: ModelCatalogFilterRowComponent,
  title: "Features/LlmSettings/ModelCatalogFilterRow",
  tags: ["autodocs"],
  args: {
    label: "Categoría",
    options: ["all", "texto", "codigo", "razonamiento"],
    active: "texto",
    labelMap: {
      all: "Todas",
      texto: "Texto",
      codigo: "Código",
      razonamiento: "Razonamiento",
    },
  },
};
export default meta;

type Story = StoryObj<ModelCatalogFilterRowComponent>;

export const Default: Story = {};

export const AllActive: Story = {
  args: { active: "all" },
};

export const NoLabelMap: Story = {
  args: { labelMap: {} },
};

export const SingleOptionHidden: Story = {
  args: { options: ["all"] },
};
