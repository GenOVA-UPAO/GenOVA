import type { Meta, StoryObj } from "@storybook/angular";

import { VerifyEmailNoticeComponent } from "./verify-email-notice.component";

const meta: Meta<VerifyEmailNoticeComponent> = {
  component: VerifyEmailNoticeComponent,
  title: "Features/Auth/VerifyEmailNotice",
  tags: ["autodocs"],
  args: {
    email: "estudiante@upao.edu.pe",
    onResend: () => Promise.resolve("Enlace reenviado."),
  },
};
export default meta;

type Story = StoryObj<VerifyEmailNoticeComponent>;

export const Default: Story = {};

export const ResendFails: Story = {
  args: {
    onResend: () => Promise.reject(new Error("network error")),
  },
};
