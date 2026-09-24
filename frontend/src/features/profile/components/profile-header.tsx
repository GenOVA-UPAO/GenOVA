import { PageHeader } from "@/core/components/page-header";
import { Skeleton } from "@/core/components/ui/skeleton";

import { formatDate, formatRole } from "../lib/profile-format";
import type { ProfileData } from "../lib/types";

interface ProfileHeaderProps {
  profile: ProfileData | null;
  role: string;
  isLoading: boolean;
}

export function ProfileHeader({ profile, role, isLoading }: Readonly<ProfileHeaderProps>) {
  if (isLoading) {
    return (
      <div className="space-y-2.5" aria-hidden="true">
        <Skeleton className="h-9 w-72 max-w-full" />
        <Skeleton className="h-4 w-56 max-w-full" />
      </div>
    );
  }

  return (
    <PageHeader
      title={profile?.full_name ?? "Mi perfil"}
      subtitle={
        // El rol va junto a los datos de la cuenta: como badge suelto a la derecha
        // quedaba lejos del nombre y no se asociaba a nada.
        <>
          <span className="block [overflow-wrap:anywhere]">{profile?.email ?? ""}</span>
          <span className="block">
            {formatRole(role)} · Miembro desde {formatDate(profile?.created_at)}
          </span>
        </>
      }
    />
  );
}
