import type { Meta, StoryObj } from "@storybook/angular";

import { WorkspaceResizableDividerComponent } from "./workspace-resizable-divider.component";

const meta: Meta<WorkspaceResizableDividerComponent> = {
  component: WorkspaceResizableDividerComponent,
  title: "Features/OvaWorkspace/Editor/WorkspaceResizableDivider",
  tags: ["autodocs"],
  args: {
    ratio: 0.38,
    containerRef: null,
  },
  render: (args) => ({
    props: args,
    template: `
      <div style="display: flex; height: 240px; border: 1px solid var(--border, #e5e7eb);">
        <div style="flex: 1; padding: 8px;">Panel izquierdo</div>
        <gn-workspace-resizable-divider [ratio]="ratio" [containerRef]="containerRef" />
        <div style="flex: 1; padding: 8px;">Panel derecho</div>
      </div>
    `,
  }),
};
export default meta;

type Story = StoryObj<WorkspaceResizableDividerComponent>;

export const Default: Story = {};

export const NarrowSplit: Story = {
  args: { ratio: 0.2 },
};

export const WideSplit: Story = {
  args: { ratio: 0.7 },
};
