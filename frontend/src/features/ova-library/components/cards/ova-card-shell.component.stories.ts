import type { Meta, StoryObj } from "@storybook/angular";

import { OvaCardShellComponent } from "./ova-card-shell.component";

const meta: Meta<OvaCardShellComponent> = {
  component: OvaCardShellComponent,
  title: "Features/OvaLibrary/OvaCardShell",
  tags: ["autodocs"],
  args: {
    ova: {
      id: "ova-1",
      title: "Fotosíntesis y el Ciclo del Carbono",
      description: "OVA sobre biología celular para 2° año de secundaria.",
      status: "listo",
    },
    isSelected: false,
    checkboxDisabled: false,
    dateLabel: "Creado el",
    dateValue: "04 jul 2026",
  },
};
export default meta;

type Story = StoryObj<OvaCardShellComponent>;

export const Default: Story = {};

export const Selected: Story = {
  args: { isSelected: true },
};

export const WithOwner: Story = {
  args: {
    ova: {
      id: "ova-2",
      title: "Introducción a la Estadística",
      description: "Medidas de tendencia central y dispersión.",
      status: "generando",
      owner: { full_name: "Ana Torres" },
    },
  },
};

export const CheckboxDisabled: Story = {
  args: { checkboxDisabled: true },
};
