import { PageHeader } from "@/core/components/page-header";
import { Badge } from "@/core/components/ui/badge";
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
        <>
          {profile?.email ?? ""}
          <span className="block sm:inline">
            <span className="hidden sm:inline"> · </span>Miembro desde{" "}
            {formatDate(profile?.created_at)}
          </span>
        </>
      }
      actions={<Badge variant="secondary">{formatRole(role)}</Badge>}
    />
  );
}
