import type { Meta, StoryObj } from "@storybook/angular";

import { ThemeMiniPreviewComponent, ThemeRadioOptionComponent } from "./theme-modal-controls";

const meta: Meta<ThemeRadioOptionComponent> = {
  component: ThemeRadioOptionComponent,
  title: "Features/OvaLibrary/ThemeModalControls",
  tags: ["autodocs"],
  args: {
    label: "Paleta UPAO",
    desc: "Azul institucional #0A3D91 + naranja #F47A20",
    checked: false,
  },
};
export default meta;

type Story = StoryObj<ThemeRadioOptionComponent>;

export const RadioUnchecked: Story = {};

export const RadioChecked: Story = {
  args: { checked: true },
};

// ThemeMiniPreviewComponent lives in this same file — reusing the same title
// group via a custom `render` (CSF3 only allows one default export/meta per
// stories file, and a per-story `component` override doesn't type-check
// against a Meta<ThemeRadioOptionComponent>-derived StoryObj).
export const MiniPreviewUpao: Story = {
  render: () => ({
    component: ThemeMiniPreviewComponent,
    props: { colorMode: "upao", designMode: "upao", palette: null },
  }),
};

export const MiniPreviewAi: Story = {
  render: () => ({
    component: ThemeMiniPreviewComponent,
    props: { colorMode: "ai", designMode: "ai", palette: null },
  }),
};

export const MiniPreviewCustomPalette: Story = {
  render: () => ({
    component: ThemeMiniPreviewComponent,
    props: {
      colorMode: "custom",
      designMode: "upao",
      palette: { name: "Oceano", p: "#164E63", a: "#38BDF8" },
    },
  }),
};
