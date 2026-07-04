import type { Meta, StoryObj } from "@storybook/angular";

import { RoleFormModalComponent } from "./role-form-modal.component";

const meta: Meta<RoleFormModalComponent> = {
  component: RoleFormModalComponent,
  title: "Features/Admin/RoleFormModal",
  tags: ["autodocs"],
  args: {
    editingRole: null,
    roleName: "",
    roleDescription: "",
    selectedPermissions: [],
    formError: "",
    isSubmitting: false,
  },
};
export default meta;

type Story = StoryObj<RoleFormModalComponent>;

export const CreateNew: Story = {};

export const EditExisting: Story = {
  args: {
    editingRole: {
      id: "role-1",
      name: "profesor",
      description: "Puede crear y gestionar sus propios OVAs.",
      user_count: 8,
      permissions: ["ova:create", "ova:edit", "ova:view"],
    },
    roleName: "profesor",
    roleDescription: "Puede crear y gestionar sus propios OVAs.",
    selectedPermissions: ["ova:create", "ova:edit", "ova:view"],
  },
};

export const Submitting: Story = {
  args: {
    roleName: "supervisor",
    isSubmitting: true,
  },
};

export const WithError: Story = {
  args: {
    roleName: "docente",
    formError: "Ya existe un rol con ese nombre.",
  },
};
