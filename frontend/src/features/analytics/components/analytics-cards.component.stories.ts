import type { Meta, StoryObj } from "@storybook/angular";

import { StatCardsComponent, StatusBreakdownComponent } from "./analytics-cards.component";

const meta: Meta<StatCardsComponent> = {
  component: StatCardsComponent,
  title: "Features/Analytics/StatCards",
  tags: ["autodocs"],
  args: {
    totals: { ovas: 128, users: 340 },
    scope: "platform",
  },
};
export default meta;

type Story = StoryObj<StatCardsComponent>;

export const Platform: Story = {};

export const Cohort: Story = {
  args: {
    totals: { ovas: 24, students: 56 },
    scope: "docente",
  },
};

export const StatusBreakdown: Story = {
  render: () => ({
    moduleMetadata: { imports: [StatusBreakdownComponent] },
    props: {
      byStatus: { listo: 60, generando: 15, borrador: 40, error: 13 },
    },
    template: `<gn-status-breakdown [byStatus]="byStatus"></gn-status-breakdown>`,
  }),
};

export const StatusBreakdownEmpty: Story = {
  render: () => ({
    moduleMetadata: { imports: [StatusBreakdownComponent] },
    props: {
      byStatus: {},
    },
    template: `<gn-status-breakdown [byStatus]="byStatus"></gn-status-breakdown>`,
  }),
};
