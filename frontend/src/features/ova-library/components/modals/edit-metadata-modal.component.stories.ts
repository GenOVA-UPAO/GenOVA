import type { Meta, StoryObj } from "@storybook/angular";

import { EditMetadataModalComponent } from "./edit-metadata-modal.component";

const meta: Meta<EditMetadataModalComponent> = {
  component: EditMetadataModalComponent,
  title: "Features/OvaLibrary/EditMetadataModal",
  tags: ["autodocs"],
  args: {
    initial: {
      title: "Fotosíntesis y el Ciclo del Carbono",
      description: "OVA sobre biología celular para 2° año de secundaria.",
    },
    isLoading: false,
  },
};
export default meta;

type Story = StoryObj<EditMetadataModalComponent>;

export const Default: Story = {};

export const EmptyDescription: Story = {
  args: {
    initial: { title: "Introducción a la Estadística", description: "" },
  },
};

export const Loading: Story = {
  args: { isLoading: true },
};
