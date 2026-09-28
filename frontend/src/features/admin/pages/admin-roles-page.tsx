import { Icon } from "@/core/components/icon";
import { PageHeader } from "@/core/components/page-header";
import { Button } from "@/core/components/ui/button";

import { DeleteRoleModal } from "../components/delete-role-modal";
import { RegistrationModeCard } from "../components/registration-mode-card";
import { RoleFormModal } from "../components/role-form-modal";
import { RolesPanel } from "../components/roles-panel";
import { useAdminRolesController } from "../hooks/use-admin-roles-controller";

export function AdminRolesPage() {
  const controller = useAdminRolesController();

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title="Gestión de roles"
        subtitle="Decide qué puede hacer cada perfil de usuario en GenOVA."
        actions={
          <Button onClick={controller.openCreate} className="max-md:h-11">
            <Icon name="plus" size="text-base" /> Nuevo rol
          </Button>
        }
      />
      <RegistrationModeCard
        tesis={controller.tesis}
        saving={controller.savingMode}
        onToggle={controller.toggleMode}
      />
      <RolesPanel
        isLoading={controller.isLoading}
        error={controller.error}
        roles={controller.roles}
        onRetry={controller.retry}
        onCreate={controller.openCreate}
        onEdit={controller.openEdit}
        onDelete={controller.requestDelete}
      />
      {controller.isFormOpen && (
        <RoleFormModal
          editingRole={controller.editingRole}
          isSubmitting={controller.isSubmitting}
          serverError={controller.formError}
          onSubmit={controller.submitForm}
          onClose={controller.closeForm}
        />
      )}
      {controller.deletingRole !== null && (
        <DeleteRoleModal
          role={controller.deletingRole}
          roles={controller.roles}
          isDeleting={controller.isDeleting}
          serverError={controller.deleteError}
          onConfirm={controller.confirmDelete}
          onCancel={controller.cancelDelete}
        />
      )}
    </div>
  );
}
