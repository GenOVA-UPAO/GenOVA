import type { Meta, StoryObj } from "@storybook/angular";

import { TrashModalComponent } from "./trash-modal.component";

const meta: Meta<TrashModalComponent> = {
  component: TrashModalComponent,
  title: "Features/OvaLibrary/TrashModal",
  tags: ["autodocs"],
  args: {
    ova: {
      id: "ova-1",
      title: "Fotosíntesis y el Ciclo del Carbono",
      status: "listo",
    },
    isLoading: false,
  },
};
export default meta;

type Story = StoryObj<TrashModalComponent>;

export const Default: Story = {};

export const Loading: Story = {
  args: { isLoading: true },
};
