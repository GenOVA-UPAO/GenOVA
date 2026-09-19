import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/core/components/ui/tabs";

import type { AdminCatalogItem } from "../hooks/admin-llm-view";
import type { SlotIssue } from "../lib/chain-validation";
import type { Draft } from "../lib/llm-config-draft";
import { ModelsCredentialsTab } from "./models-credentials-tab";
import { ModelsMasterDetail } from "./models-master-detail";
import { ModelsPlatformTab } from "./models-platform-tab";

const TAB_TRIGGER =
  "inline-flex shrink-0 items-center justify-center rounded-xl px-3 py-2.5 text-sm font-semibold tracking-tight text-muted-foreground sm:px-5 hover:text-foreground data-active:bg-card data-active:text-foreground data-active:shadow-sm data-active:ring-1 data-active:ring-border/60";

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
    <Tabs value={props.activeTab} onValueChange={props.onTabChange} className="block space-y-5">
      <div className="flex justify-center">
        <TabsList className="inline-flex h-auto w-max max-w-full flex-nowrap items-center justify-start gap-1 overflow-x-auto rounded-2xl border border-border/70 bg-muted/40 p-1.5 shadow-sm backdrop-blur-sm group-data-horizontal/tabs:h-auto">
          <TabsTrigger value="models" className={TAB_TRIGGER}>
            Modelos
          </TabsTrigger>
          <TabsTrigger value="credentials" className={TAB_TRIGGER}>
            Credenciales
          </TabsTrigger>
          {props.isAdmin ? (
            <TabsTrigger value="platform" className={TAB_TRIGGER}>
              Plataforma
              <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[9px] font-bold tracking-wider text-amber-700 uppercase ring-1 ring-amber-500/25 dark:text-amber-400">
                Admin
              </span>
            </TabsTrigger>
          ) : null}
        </TabsList>
      </div>
      <TabsContent value="models" className="mt-0 block space-y-6">
        {props.adminLoading ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="h-44 animate-pulse rounded-2xl bg-muted" />
            <div className="h-44 animate-pulse rounded-2xl bg-muted" />
            <div className="h-44 animate-pulse rounded-2xl bg-muted" />
            <div className="h-44 animate-pulse rounded-2xl bg-muted" />
          </div>
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
      <TabsContent value="credentials" className="mt-0 block space-y-6">
        <ModelsCredentialsTab isAdmin={props.isAdmin} />
      </TabsContent>
      {props.isAdmin ? (
        <TabsContent value="platform" className="mt-0 block space-y-6">
          <ModelsPlatformTab />
        </TabsContent>
      ) : null}
    </Tabs>
  );
}
