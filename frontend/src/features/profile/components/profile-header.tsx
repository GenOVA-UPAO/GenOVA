import { PageHeader } from "@/core/components/page-header";
import { Skeleton } from "@/core/components/ui/skeleton";

import { formatDate, formatRole, getInitials } from "../lib/profile-format";
import type { ProfileData } from "../lib/types";

interface ProfileHeaderProps {
  profile: ProfileData | null;
  role: string;
  isLoading: boolean;
}

import { useTranslation } from "react-i18next";

export function ProfileHeader({ profile, role, isLoading }: Readonly<ProfileHeaderProps>) {
  const { t } = useTranslation("profile");

  if (isLoading) {
    return (
      <div className="space-y-2.5" aria-hidden="true">
        <Skeleton className="h-9 w-72 max-w-full" />
        <Skeleton className="h-4 w-56 max-w-full" />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4 sm:gap-5">
      <div
        aria-hidden="true"
        className="flex size-14 shrink-0 items-center justify-center rounded-full bg-primary text-lg font-semibold text-primary-foreground sm:size-16 sm:text-xl"
      >
        {getInitials(profile?.full_name)}
      </div>
      <PageHeader
        className="min-w-0 flex-1"
        title={profile?.full_name ?? t("header.defaultTitle")}
        subtitle={
          // El rol va junto a los datos de la cuenta: como badge suelto a la derecha
          // quedaba lejos del nombre y no se asociaba a nada.
          <>
            <span className="block [overflow-wrap:anywhere]">{profile?.email ?? ""}</span>
            <span className="block">
              {formatRole(role)} · {t("header.memberSince", { date: formatDate(profile?.created_at) })}
            </span>
          </>
        }
      />
    </div>
  );
}
