import type { Meta, StoryObj } from "@storybook/angular";

import { DeleteAccountFormComponent } from "./delete-account-form.component";

const meta: Meta<DeleteAccountFormComponent> = {
  component: DeleteAccountFormComponent,
  title: "Features/Profile/DeleteAccountForm",
  tags: ["autodocs"],
  args: {
    isSubmitting: false,
    serverError: "",
  },
};
export default meta;

type Story = StoryObj<DeleteAccountFormComponent>;

export const Default: Story = {};

export const Submitting: Story = {
  args: { isSubmitting: true },
};

export const WithServerError: Story = {
  args: { serverError: "No se pudo eliminar la cuenta. Intenta de nuevo." },
};
