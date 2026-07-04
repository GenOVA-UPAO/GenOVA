import type { Meta, StoryObj } from "@storybook/angular";

import { AdminLayoutComponent } from "./admin-layout";

const meta: Meta<AdminLayoutComponent> = {
  component: AdminLayoutComponent,
  title: "App/AdminLayout",
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj<AdminLayoutComponent>;

// Uses the app's empty global router (no routes registered in Storybook), so
// <router-outlet /> renders nothing — expected/acceptable for a shell story.
export const Default: Story = {};
