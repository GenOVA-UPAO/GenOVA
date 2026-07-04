import type { Meta, StoryObj } from "@storybook/angular";

import { TrashedOvaCardComponent } from "./trashed-ova-card.component";

const meta: Meta<TrashedOvaCardComponent> = {
  component: TrashedOvaCardComponent,
  title: "Features/OvaLibrary/TrashedOvaCard",
  tags: ["autodocs"],
  args: {
    ova: {
      id: "ova-1",
      title: "Fotosíntesis y el Ciclo del Carbono",
      description: "OVA sobre biología celular para 2° año de secundaria.",
      status: "listo",
      deleted_at: "2026-07-01T10:00:00Z",
    },
    isSelected: false,
    isRestoring: false,
    isDeleting: false,
  },
};
export default meta;

type Story = StoryObj<TrashedOvaCardComponent>;

export const Default: Story = {};

export const Selected: Story = {
  args: { isSelected: true },
};

export const Restoring: Story = {
  args: { isRestoring: true },
};

export const Deleting: Story = {
  args: { isDeleting: true },
};
