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
      <div className="mx-auto max-w-7xl space-y-6 pb-28 duration-300 animate-in fade-in">
        <ModelsPageHeader />
        <QueryErrorState title={page.store.error} onRetry={page.store.refetch} />
      </div>
    );
  }

  return (
    <LlmSettingsContext.Provider value={page.store}>
      <div className="mx-auto max-w-7xl space-y-6 pb-28 duration-300 animate-in fade-in">
        <ModelsPageHeader status={page.headerStatus} />
        <ModelsPageTabs
          activeTab={page.activeTab}
          onTabChange={page.setActiveTab}
          isAdmin={page.isAdmin}
          adminLoading={page.admin.loading}
          tasks={page.admin.tasks}
          draft={page.admin.draft}
          adminModels={page.admin.models}
          adminSaving={page.admin.saving}
          chainIssues={page.taskIssues}
          onDraftChange={page.onDraftChange}
          onOpenCatalog={() => {
            page.setManageOpen(true);
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
            chainInvalid={page.chainInvalid}
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
