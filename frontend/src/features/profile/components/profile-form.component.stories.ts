import type { Meta, StoryObj } from "@storybook/angular";

import { ProfileFormComponent } from "./profile-form.component";

const meta: Meta<ProfileFormComponent> = {
  component: ProfileFormComponent,
  title: "Features/Profile/ProfileForm",
  tags: ["autodocs"],
  args: {
    profile: {
      full_name: "Ana Torres",
      email: "ana.torres@upao.edu.pe",
      university_id: "257022",
      gender: "femenino",
      phone_number: "+51987654321",
    },
    role: "estudiante",
    createdAt: "2025-03-01T00:00:00.000Z",
    hideHeader: false,
    isSubmitting: false,
    getInitials: () => "AT",
    formatDate: (date?: string) => (date ? new Date(date).toLocaleDateString("es-ES") : "-"),
  },
};
export default meta;

type Story = StoryObj<ProfileFormComponent>;

export const Default: Story = {};

export const HiddenHeader: Story = {
  args: { hideHeader: true },
};

export const Submitting: Story = {
  args: { isSubmitting: true },
};

export const EmptyProfile: Story = {
  args: {
    profile: {},
    role: "estudiante",
    createdAt: "",
  },
};
