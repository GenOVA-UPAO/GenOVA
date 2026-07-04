import type { Meta, StoryObj } from "@storybook/angular";

import { DashboardStatCardComponent } from "./dashboard-stat-card.component";

const meta: Meta<DashboardStatCardComponent> = {
  component: DashboardStatCardComponent,
  title: "Features/OvaLibrary/Pages/DashboardStatCard",
  tags: ["autodocs"],
  args: {
    label: "OVAs Creadas",
    value: 12,
    sub: "Total en tu biblioteca",
    tone: "text-primary",
  },
};
export default meta;

type Story = StoryObj<DashboardStatCardComponent>;

export const Default: Story = {};

export const InProgress: Story = {
  args: {
    label: "En Progreso",
    value: 3,
    sub: "Generaciones activas",
    tone: "text-accent-brand",
  },
};

export const Ready: Story = {
  args: {
    label: "Listas",
    value: 8,
    sub: "Preparadas para exportar",
    tone: "text-emerald-600 dark:text-emerald-400",
  },
};
