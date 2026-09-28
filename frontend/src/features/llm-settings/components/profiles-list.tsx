import { useState } from "react";
import { toast } from "sonner";

import { EmptyState } from "@/core/components/empty-state";
import { QueryErrorState } from "@/core/components/query-error-state";

import type { ModelProfile } from "../api/model-tools.api";
import { errorMessage } from "../hooks/error-message";
import type { useModelProfiles } from "../hooks/use-model-profiles";
import { ModelsSheetSkeleton } from "./models-sheet-skeleton";
import { ProfileRow } from "./profile-row";

interface ProfilesListProps {
  profiles: ReturnType<typeof useModelProfiles>;
  onApply: (profile: ModelProfile) => void;
  onDelete: (profile: ModelProfile) => void;
}

export function ProfilesList({ profiles, onApply, onDelete }: Readonly<ProfilesListProps>) {
  const [renamingId, setRenamingId] = useState<string | null>(null);

  if (profiles.loading) return <ModelsSheetSkeleton />;
  if (profiles.error) {
    return (
      <QueryErrorState title="No se pudieron cargar los perfiles." onRetry={profiles.refetch} />
    );
  }
  if (profiles.profiles.length === 0) {
    return (
      <EmptyState
        icon="stack"
        title="Aún no hay perfiles"
        description="Guarda la configuración actual con un nombre («Económico», «Máxima calidad»…) y cambia de una a otra sin elegir modelo por modelo."
        className="py-10"
      />
    );
  }
  return (
    <ul className="divide-y divide-border" aria-label="Perfiles guardados">
      {profiles.profiles.map((profile) => (
        <ProfileRow
          key={profile.id}
          profile={profile}
          renaming={renamingId === profile.id}
          renameSaving={profiles.rename.isPending}
          renameError={profiles.rename.error ? errorMessage(profiles.rename.error, "") : null}
          onApply={() => {
            onApply(profile);
          }}
          onStartRename={() => {
            profiles.rename.reset();
            setRenamingId(profile.id);
          }}
          onCancelRename={() => {
            setRenamingId(null);
          }}
          onRename={(name) => {
            profiles.rename.mutate(
              { id: profile.id, name },
              {
                onSuccess: () => {
                  setRenamingId(null);
                  toast.success(`Perfil renombrado a «${name}».`);
                },
              },
            );
          }}
          onDelete={() => {
            onDelete(profile);
          }}
        />
      ))}
    </ul>
  );
}
