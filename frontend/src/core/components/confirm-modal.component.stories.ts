import type { Meta, StoryObj } from "@storybook/angular";

import { ConfirmModalComponent } from "./confirm-modal.component";

const meta: Meta<ConfirmModalComponent> = {
  component: ConfirmModalComponent,
  title: "Core/ConfirmModal",
  tags: ["autodocs"],
  args: {
    title: "¿Eliminar OVA?",
    message: "Esta acción no se puede deshacer.",
    confirmLabel: "Eliminar",
    danger: true,
    isLoading: false,
  },
};
export default meta;

type Story = StoryObj<ConfirmModalComponent>;

export const Default: Story = {};

export const Loading: Story = {
  args: { isLoading: true },
};

export const NonDestructive: Story = {
  args: {
    title: "¿Guardar cambios?",
    message: "Se sobrescribirá la versión anterior del OVA.",
    confirmLabel: "Guardar",
    danger: false,
  },
};
