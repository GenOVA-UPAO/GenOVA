import { QueryErrorState } from "@/core/components/query-error-state";

import { ManageModelsModal } from "../components/manage-models-modal";
import { ModelsPageHeader } from "../components/models-page-header";
import { ModelsPageTabs } from "../components/models-page-tabs";
import { UnsavedChangesBar } from "../components/unsaved-changes-bar";
import { LlmSettingsContext } from "../hooks/use-llm-settings";
import { useModelsPage } from "../hooks/use-models-page";

export function ModelsPage() {
  const page = useModelsPage();
  if (page.blocked) return null;

  if (page.store.error) {
    return (
      <div className="mx-auto max-w-7xl space-y-6">
        <ModelsPageHeader />
        <QueryErrorState title={page.store.error} onRetry={page.store.refetch} />
      </div>
    );
  }

  return (
    <LlmSettingsContext.Provider value={page.store}>
      <div className="mx-auto max-w-7xl space-y-6">
        <ModelsPageHeader status={page.headerStatus} canEdit={page.canEdit} />
        <ModelsPageTabs
          activeTab={page.activeTab}
          onTabChange={page.setActiveTab}
          isAdmin={page.isAdmin}
          adminLoading={page.admin.loading}
          adminError={page.admin.error}
          onAdminRetry={page.admin.retry}
          tasks={page.admin.tasks}
          draft={page.admin.draft}
          adminModels={page.admin.models}
          adminSaving={page.admin.saving}
          chainIssues={page.taskIssues}
          onDraftChange={page.onDraftChange}
          onOpenCatalog={() => {
            page.setManageOpen(true);
          }}
          onConnectProvider={page.goToPlatformKey}
          onGoToCredentials={() => {
            page.goToApiKeys();
          }}
        />
        <ManageModelsModal
          open={page.manageOpen}
          onClose={() => {
            page.setManageOpen(false);
          }}
          onGoToApiKeys={page.goToApiKeys}
        />
        {page.dirty ? (
          <UnsavedChangesBar
            blockingMessage={page.chainMessage}
            saving={page.admin.saving}
            onDiscard={page.discard}
            onSave={() => {
              void page.saveAll();
            }}
          />
        ) : null}
      </div>
    </LlmSettingsContext.Provider>
  );
}
