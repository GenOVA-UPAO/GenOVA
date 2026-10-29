import { useTranslation } from "react-i18next";

import { ConfirmModal } from "@/core/components/confirm-modal";
import { Icon } from "@/core/components/icon";
import { PageHeader } from "@/core/components/page-header";
import { Button } from "@/core/components/ui/button";

import { LtiPlatformFormModal } from "../components/lti/lti-platform-form-modal";
import { LtiPlatformList } from "../components/lti/lti-platform-list";
import { LtiToolCard } from "../components/lti/lti-tool-card";
import { useAdminLtiController } from "../hooks/use-admin-lti-controller";

export function AdminLtiPage() {
  const { t } = useTranslation();
  const c = useAdminLtiController();

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title={t("lti:title")}
        subtitle={t("lti:subtitle")}
        actions={
          <Button onClick={c.openCreate} className="max-md:h-11">
            <Icon name="plus" size="text-base" /> {t("lti:register")}
          </Button>
        }
      />
      <LtiToolCard tool={c.tool.data} isLoading={c.tool.isLoading} error={c.tool.error} />
      <section aria-labelledby="lti-platforms-title" className="space-y-3">
        <h2 id="lti-platforms-title" className="font-display text-xl font-semibold">
          {t("lti:platformsTitle")}
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
          title={t("lti:deleteTitle", { name: c.deleting.name })}
          message={t("lti:deleteDescription")}
          confirmLabel={t("lti:deleteConfirm")}
          loadingLabel={t("lti:deleting")}
          confirmPhrase={c.deleting.name}
          isLoading={c.isDeleting}
          onConfirm={c.confirmDelete}
          onCancel={c.cancelDelete}
        />
      )}
    </div>
  );
}
