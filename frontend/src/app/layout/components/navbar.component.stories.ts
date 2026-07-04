import type { Meta, StoryObj } from "@storybook/angular";
import { http, HttpResponse } from "msw";

import { NavbarComponent } from "./navbar.component";

const meta: Meta<NavbarComponent> = {
  component: NavbarComponent,
  title: "App/Navbar",
  tags: ["autodocs"],
  parameters: {
    msw: {
      handlers: [http.get("/api/ovas/papelera/count", () => HttpResponse.json({ count: 0 }))],
    },
  },
};
export default meta;

type Story = StoryObj<NavbarComponent>;

// AuthService.user is null in Storybook (no seeded sessionStorage), so the
// avatar shows the guest fallback initials and dropdown copy.
export const Default: Story = {};
