import type { Meta, StoryObj } from "@storybook/angular";
import { http, HttpResponse } from "msw";

import { SidebarMenuComponent } from "./sidebar-menu.component";

const meta: Meta<SidebarMenuComponent> = {
  component: SidebarMenuComponent,
  title: "App/SidebarMenu",
  tags: ["autodocs"],
  parameters: {
    msw: {
      handlers: [http.get("/api/ovas/papelera/count", () => HttpResponse.json({ count: 0 }))],
    },
  },
};
export default meta;

type Story = StoryObj<SidebarMenuComponent>;

// AuthService.user is null in Storybook, so admin/config sections that
// require permissions won't render — only the base "Principal" section shows.
export const Default: Story = {};

export const WithTrashBadge: Story = {
  parameters: {
    msw: {
      handlers: [http.get("/api/ovas/papelera/count", () => HttpResponse.json({ count: 5 }))],
    },
  },
};
