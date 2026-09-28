import { useState } from "react";

import { EmptyState } from "@/core/components/empty-state";
import { QueryErrorState } from "@/core/components/query-error-state";
import { Button } from "@/core/components/ui/button";

import { ProfileHeader } from "../components/profile-header";
import { ProfileSkeleton } from "../components/profile-skeleton";
import { ProfileWorkspace } from "../components/profile-workspace";
import { useProfile } from "../hooks/use-profile";
import { useProfileActions } from "../hooks/use-profile-actions";

const TAB_INFO = "info";
const TAB_CONFIG = "config";

export function ProfilePage() {
  const profileQuery = useProfile();
  const actions = useProfileActions();
  const [tab, setTab] = useState(TAB_INFO);
  const retry = () => {
    void profileQuery.refetch();
  };

  if (profileQuery.isError) {
    return (
      <div className="mx-auto max-w-7xl space-y-6">
        <QueryErrorState title="No se pudo cargar el perfil" onRetry={retry} />
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
          title="No hay datos de perfil"
          description="Vuelve a cargar tu información para continuar."
          action={
            <Button variant="outline" onClick={retry}>
              Reintentar
            </Button>
          }
        />
      </div>
    );
  }

  const role = profile.role ?? "usuario";
  const activeTab = tab === TAB_CONFIG && role !== "administrador" ? TAB_INFO : tab;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <ProfileWorkspace
        profile={profile}
        activeTab={activeTab}
        onTabChange={setTab}
        actions={actions}
      />
    </div>
  );
}
