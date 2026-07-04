import type { Meta, StoryObj } from "@storybook/angular";

import { EditUserModalComponent } from "./edit-user-modal.component";

const meta: Meta<EditUserModalComponent> = {
  component: EditUserModalComponent,
  title: "Features/Admin/Users/EditUserModal",
  tags: ["autodocs"],
  args: {
    user: {
      id: "user-1",
      full_name: "Ana Torres",
      email: "ana.torres@upao.edu.pe",
      is_active: true,
      role: { id: "role-2", name: "estudiante" },
      university_id: 257022,
      gender: "femenino",
      phone_number: "+51987285992",
    },
  },
};
export default meta;

type Story = StoryObj<EditUserModalComponent>;

export const Default: Story = {};

export const MissingOptionalFields: Story = {
  args: {
    user: {
      id: "user-2",
      email: "sin.datos@upao.edu.pe",
      is_active: true,
    },
  },
};
