import type { Meta, StoryObj } from "@storybook/angular";

import { VerifyEmailPage } from "./verify-email-page";

const meta: Meta<VerifyEmailPage> = {
  component: VerifyEmailPage,
  title: "Features/Auth/Pages/VerifyEmailPage",
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj<VerifyEmailPage>;

/**
 * Renders with the global router's empty route (no `token` query param), so the
 * component immediately shows its "invalid verification link" error state. The
 * component reads `route.queryParams` directly via `ActivatedRoute`, which isn't
 * easily overridden from story args without a per-story route provider.
 */
export const Default: Story = {};
