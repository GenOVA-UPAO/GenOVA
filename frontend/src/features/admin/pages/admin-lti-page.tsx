import { ConfirmModal } from "@/core/components/confirm-modal";
import { Icon } from "@/core/components/icon";
import { PageHeader } from "@/core/components/page-header";
import { Button } from "@/core/components/ui/button";

import { LtiPlatformFormModal } from "../components/lti/lti-platform-form-modal";
import { LtiPlatformList } from "../components/lti/lti-platform-list";
import { LtiToolCard } from "../components/lti/lti-tool-card";
import { useAdminLtiController } from "../hooks/use-admin-lti-controller";

export function AdminLtiPage() {
  const c = useAdminLtiController();

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title="Integración LTI"
        subtitle="Conecta GenOVA con el aula virtual: los docentes eligen sus OVAs dentro del curso y las notas vuelven al LMS."
        actions={
          <Button onClick={c.openCreate} className="max-md:h-11">
            <Icon name="plus" size="text-base" /> Registrar plataforma
          </Button>
        }
      />
      <LtiToolCard tool={c.tool.data} isLoading={c.tool.isLoading} error={c.tool.error} />
      <section aria-labelledby="lti-platforms-title" className="space-y-3">
        <h2 id="lti-platforms-title" className="font-display text-xl font-semibold">
          Plataformas registradas
        </h2>
        <LtiPlatformList
          platforms={c.platforms.data ?? []}
          isLoading={c.platforms.isLoading}
          error={c.platforms.error}
          onRetry={() => void c.platforms.refetch()}
          onCreate={c.openCreate}
          onEdit={c.openEdit}
          onDelete={c.requestDelete}
        />
      </section>
      {c.editing !== null && (
        <LtiPlatformFormModal
          platform={c.editing === "new" ? null : c.editing}
          isSubmitting={c.isSaving}
          serverError={c.saveError}
          onSubmit={c.submit}
          onClose={c.closeForm}
        />
      )}
      {c.deleting !== null && (
        <ConfirmModal
          title={`¿Eliminar «${c.deleting.name}»?`}
          message="Las actividades de GenOVA en ese LMS dejarán de abrirse y las notas ya no se enviarán. Escribe el nombre para confirmar."
          confirmLabel="Eliminar plataforma"
          loadingLabel="Eliminando…"
          confirmPhrase={c.deleting.name}
          isLoading={c.isDeleting}
          onConfirm={c.confirmDelete}
          onCancel={c.cancelDelete}
        />
      )}
    </div>
  );
}
