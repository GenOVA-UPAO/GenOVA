import type { Meta, StoryObj } from "@storybook/angular";

import { CatalogStatusAlertComponent } from "./catalog-status-alert.component";

const meta: Meta<CatalogStatusAlertComponent> = {
  component: CatalogStatusAlertComponent,
  title: "Features/LlmSettings/CatalogStatusAlert",
  tags: ["autodocs"],
  args: {
    catalogStatus: {
      openrouter: { ok: false, last_success_at: "2026-06-30T14:00:00Z" },
    },
    refreshing: false,
  },
};
export default meta;

type Story = StoryObj<CatalogStatusAlertComponent>;

export const Default: Story = {};

export const Refreshing: Story = {
  args: { refreshing: true },
};

export const MultipleProvidersDown: Story = {
  args: {
    catalogStatus: {
      openrouter: { ok: false, last_success_at: "2026-06-30T14:00:00Z" },
      groq: { ok: false },
    },
  },
};

export const AllOk: Story = {
  args: {
    catalogStatus: {
      openrouter: { ok: true, last_success_at: "2026-07-04T10:00:00Z" },
      groq: { ok: true, last_success_at: "2026-07-04T10:00:00Z" },
    },
  },
};
