import { useTranslation } from "react-i18next";

import { EmptyState } from "@/core/components/empty-state";
import { QueryErrorState } from "@/core/components/query-error-state";
import { Button } from "@/core/components/ui/button";
import { useTabParam } from "@/core/hooks/use-tab-param";

import { ProfileHeader } from "../components/profile-header";
import { ProfileSkeleton } from "../components/profile-skeleton";
import { ProfileWorkspace } from "../components/profile-workspace";
import { useProfile } from "../hooks/use-profile";
import { useProfileActions } from "../hooks/use-profile-actions";

const TAB_INFO = "info";
const TAB_CONFIG = "config";
const PROFILE_TABS = [TAB_INFO, TAB_CONFIG, "security"] as const;

export function ProfilePage() {
  const { t } = useTranslation("profile");
  const profileQuery = useProfile();
  const actions = useProfileActions();
  const [tab, setTab] = useTabParam(PROFILE_TABS, TAB_INFO);
  const retry = () => {
    void profileQuery.refetch();
  };

  if (profileQuery.isError) {
    return (
      <div className="mx-auto max-w-7xl space-y-6">
        <QueryErrorState title={t("page.loadError")} onRetry={retry} />
      </div>
    );
  }

  if (profileQuery.isLoading) {
    const pendingRole = "usuario";
    return (
      <div className="mx-auto max-w-7xl space-y-6">
        <ProfileHeader profile={null} role={pendingRole} isLoading />
        <ProfileSkeleton />
      </div>
    );
  }

  const profile = profileQuery.data ?? null;
  if (profile === null) {
    return (
      <div className="mx-auto max-w-7xl space-y-6">
        <EmptyState
          icon="users-three"
          title={t("page.emptyTitle")}
          description={t("page.emptyDescription")}
          action={
            <Button variant="outline" onClick={retry}>
              {t("page.retry")}
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <ProfileWorkspace
        profile={profile}
        activeTab={tab}
        onTabChange={setTab}
        actions={actions}
      />
    </div>
  );
}
