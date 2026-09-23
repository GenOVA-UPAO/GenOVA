import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/core/components/ui/tabs";

import type { AdminCatalogItem } from "../hooks/admin-llm-view";
import type { SlotIssue } from "../lib/chain-validation";
import type { Draft } from "../lib/llm-config-draft";
import { ModelsCredentialsTab } from "./models-credentials-tab";
import { ModelsMasterDetail } from "./models-master-detail";
import { ModelsPlatformTab } from "./models-platform-tab";
import { ModelsTabSkeleton } from "./models-tab-skeleton";
import { SECTION_TABS_LIST, SECTION_TABS_TRIGGER } from "./section-tabs";

interface ModelsPageTabsProps {
  activeTab: string;
  onTabChange: (value: string) => void;
  isAdmin: boolean;
  adminLoading: boolean;
  tasks: string[];
  draft: Draft | null;
  adminModels: AdminCatalogItem[];
  adminSaving: boolean;
  chainIssues: Record<string, SlotIssue[]>;
  onDraftChange: (next: Draft) => void;
  onOpenCatalog: () => void;
}

export function ModelsPageTabs(props: Readonly<ModelsPageTabsProps>) {
  return (
    <Tabs value={props.activeTab} onValueChange={props.onTabChange} className="flex-col gap-6">
      <TabsList variant="line" className={SECTION_TABS_LIST}>
        <TabsTrigger value="models" className={SECTION_TABS_TRIGGER}>
          Modelos
        </TabsTrigger>
        <TabsTrigger value="credentials" className={SECTION_TABS_TRIGGER}>
          Credenciales
        </TabsTrigger>
        {props.isAdmin ? (
          <TabsTrigger value="platform" className={SECTION_TABS_TRIGGER}>
            Plataforma
          </TabsTrigger>
        ) : null}
      </TabsList>
      <TabsContent value="models" className="block space-y-6">
        {props.adminLoading ? (
          <ModelsTabSkeleton />
        ) : (
          <ModelsMasterDetail
            tasks={props.tasks}
            draft={props.draft}
            adminModels={props.adminModels}
            isAdmin={props.isAdmin}
            adminSaving={props.adminSaving}
            chainIssues={props.chainIssues}
            onDraftChange={props.onDraftChange}
            onOpenCatalog={props.onOpenCatalog}
          />
        )}
      </TabsContent>
      <TabsContent value="credentials" className="block space-y-6">
        <ModelsCredentialsTab isAdmin={props.isAdmin} />
      </TabsContent>
      {props.isAdmin ? (
        <TabsContent value="platform" className="block space-y-6">
          <ModelsPlatformTab />
        </TabsContent>
      ) : null}
    </Tabs>
  );
}
