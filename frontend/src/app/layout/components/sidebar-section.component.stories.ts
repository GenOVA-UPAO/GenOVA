import type { Meta, StoryObj } from "@storybook/angular";

import { SidebarSectionComponent } from "./sidebar-section.component";

const meta: Meta<SidebarSectionComponent> = {
  component: SidebarSectionComponent,
  title: "App/SidebarSection",
  tags: ["autodocs"],
  args: {
    title: "Principal",
  },
  render: (args) => ({
    props: args,
    template: `
      <gn-sidebar-section [title]="title">
        <li class="px-3 py-2 text-sm text-sidebar-foreground/75">Elemento de ejemplo</li>
      </gn-sidebar-section>
    `,
  }),
};
export default meta;

type Story = StoryObj<SidebarSectionComponent>;

export const Default: Story = {};

export const ConfigSection: Story = {
  args: { title: "Configuracion" },
};
