import type { Meta, StoryObj } from "@storybook/angular";

import { SidebarNavItemComponent } from "./sidebar-nav-item.component";

const meta: Meta<SidebarNavItemComponent> = {
  component: SidebarNavItemComponent,
  title: "App/SidebarNavItem",
  tags: ["autodocs"],
  args: {
    to: "/dashboard",
    label: "Dashboard",
  },
  render: (args) => ({
    props: args,
    template: `
      <ul class="space-y-1">
        <gn-sidebar-nav-item [to]="to" [label]="label" [badge]="badge">
          <i icon class="ph ph-house shrink-0" aria-hidden="true"></i>
        </gn-sidebar-nav-item>
      </ul>
    `,
  }),
};
export default meta;

type Story = StoryObj<SidebarNavItemComponent>;

export const Default: Story = {};

export const WithBadge: Story = {
  args: { to: "/papelera", label: "Papelera", badge: 3 },
};
