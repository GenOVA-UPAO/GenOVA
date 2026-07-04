import type { Meta, StoryObj } from "@storybook/angular";

import { ResetPasswordPage } from "./reset-password-page";

const meta: Meta<ResetPasswordPage> = {
  component: ResetPasswordPage,
  title: "Features/Auth/Pages/ResetPasswordPage",
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj<ResetPasswordPage>;

/**
 * Renders with the global router's empty route (no `token` query param), so the
 * component shows its "no security token found" fallback state. The component reads
 * `route.queryParams` directly via `ActivatedRoute`, which isn't easily overridden
 * from story args without a per-story route provider.
 */
export const Default: Story = {};
