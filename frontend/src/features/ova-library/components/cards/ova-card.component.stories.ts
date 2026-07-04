import type { Meta, StoryObj } from "@storybook/angular";

import { OvaCardComponent } from "./ova-card.component";

const meta: Meta<OvaCardComponent> = {
  component: OvaCardComponent,
  title: "Features/OvaLibrary/OvaCard",
  tags: ["autodocs"],
  args: {
    ova: {
      id: "ova-1",
      title: "Fotosíntesis y el Ciclo del Carbono",
      description: "OVA sobre biología celular para 2° año de secundaria.",
      status: "listo",
      version_number: 2,
      created_at: "2026-06-20T10:00:00Z",
    },
    isSelected: false,
    isMoving: false,
    isDownloading: false,
    isDuplicating: false,
  },
};
export default meta;

type Story = StoryObj<OvaCardComponent>;

export const Ready: Story = {};

export const Generating: Story = {
  args: {
    ova: {
      id: "ova-2",
      title: "Introducción a la Estadística",
      description: "Medidas de tendencia central y dispersión.",
      status: "generando",
      created_at: "2026-07-01T10:00:00Z",
    },
    job: {
      jobId: "job-123",
      status: "running",
      progress: { done: 3, total: 7 },
      isInterrupted: false,
    },
  },
};

export const InterruptedGeneration: Story = {
  args: {
    ova: {
      id: "ova-3",
      title: "Química Orgánica Básica",
      status: "generando",
      created_at: "2026-07-02T10:00:00Z",
    },
    job: {
      jobId: "job-456",
      status: "interrupted",
      progress: { done: 2, total: 7 },
      isInterrupted: true,
    },
  },
};

export const Selected: Story = {
  args: { isSelected: true },
};

export const Downloading: Story = {
  args: { isDownloading: true },
};

export const Duplicating: Story = {
  args: { isDuplicating: true },
};

export const Moving: Story = {
  args: { isMoving: true },
};
