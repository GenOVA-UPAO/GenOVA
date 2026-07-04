import type { Meta, StoryObj } from "@storybook/angular";
import { http, HttpResponse } from "msw";

import { SidebarComponent } from "./sidebar.component";

const meta: Meta<SidebarComponent> = {
  component: SidebarComponent,
  title: "App/Sidebar",
  tags: ["autodocs"],
  parameters: {
    msw: {
      handlers: [http.get("/api/ovas/papelera/count", () => HttpResponse.json({ count: 2 }))],
    },
  },
  decorators: [
    (story) => ({
      template: `<div style="height: 600px; display: flex;">${story().template}</div>`,
      props: story().props,
    }),
  ],
};
export default meta;

type Story = StoryObj<SidebarComponent>;

export const Default: Story = {};
