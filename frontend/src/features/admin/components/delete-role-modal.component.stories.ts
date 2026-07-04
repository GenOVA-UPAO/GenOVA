import type { Meta, StoryObj } from "@storybook/angular";

import { DeleteRoleModalComponent } from "./delete-role-modal.component";

const meta: Meta<DeleteRoleModalComponent> = {
  component: DeleteRoleModalComponent,
  title: "Features/Admin/DeleteRoleModal",
  tags: ["autodocs"],
  args: {
    deletingRole: { id: "role-1", name: "profesor", user_count: 0 },
    roles: [
      { id: "role-1", name: "profesor", user_count: 0 },
      { id: "role-2", name: "estudiante", user_count: 12 },
      { id: "role-3", name: "administrador", user_count: 2 },
    ],
    reassignRoleId: "",
    deleteError: "",
    isDeleting: false,
  },
};
export default meta;

type Story = StoryObj<DeleteRoleModalComponent>;

export const Default: Story = {};

export const WithAssignedUsers: Story = {
  args: {
    deletingRole: { id: "role-2", name: "estudiante", user_count: 12 },
  },
};

export const Deleting: Story = {
  args: {
    isDeleting: true,
  },
};

export const WithError: Story = {
  args: {
    deletingRole: { id: "role-2", name: "estudiante", user_count: 12 },
    deleteError: "No se pudo eliminar el rol. Intenta de nuevo.",
  },
};
