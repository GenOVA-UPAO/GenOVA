import type { Meta, StoryObj } from "@storybook/angular";
import { http, HttpResponse } from "msw";

import { AppLayout } from "./app-layout";

const meta: Meta<AppLayout> = {
  component: AppLayout,
  title: "App/AppLayout",
  tags: ["autodocs"],
  parameters: {
    msw: {
      handlers: [http.get("/api/ovas/papelera/count", () => HttpResponse.json({ count: 0 }))],
    },
  },
};
export default meta;

type Story = StoryObj<AppLayout>;

// Uses the app's empty global router (no routes registered in Storybook), so
// <router-outlet /> renders nothing inside the main container — expected for
// a shell story. ActivatedRoute has no snapshot data, so `fullBleed` stays false.
export const Default: Story = {};
