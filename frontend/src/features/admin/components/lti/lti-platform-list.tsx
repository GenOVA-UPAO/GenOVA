import { useTranslation } from "react-i18next";

import { EmptyState } from "@/core/components/empty-state";
import { QueryErrorState } from "@/core/components/query-error-state";
import { Button } from "@/core/components/ui/button";
import { Skeleton } from "@/core/components/ui/skeleton";

import type { LtiPlatform } from "../../api/admin-lti.api";
import { PlatformRow } from "./lti-platform-row";

interface LtiPlatformListProps {
  platforms: LtiPlatform[];
  isLoading: boolean;
  error: Error | null;
  onRetry: () => void;
  onCreate: () => void;
  onEdit: (platform: LtiPlatform) => void;
  onDelete: (platform: LtiPlatform) => void;
}

export function LtiPlatformList(props: Readonly<LtiPlatformListProps>) {
  const { t } = useTranslation();
  const { platforms, isLoading, error, onRetry, onCreate, onEdit, onDelete } = props;
  if (isLoading) return <Skeleton className="h-32 w-full" />;
  if (error !== null) {
    return <QueryErrorState title={t("lti:loadPlatforms")} onRetry={onRetry} />;
  }
  if (platforms.length === 0) {
    return (
      <EmptyState
        icon="link"
        title={t("lti:emptyTitle")}
        description={t("lti:emptyDescription")}
        action={<Button onClick={onCreate}>{t("lti:register")}</Button>}
      />
    );
  }
  return (
    <ul className="divide-y divide-border rounded-xl border border-border bg-card px-5">
      {platforms.map((platform) => (
        <PlatformRow
          key={platform.id}
          platform={platform}
          onEdit={() => {
            onEdit(platform);
          }}
          onDelete={() => {
            onDelete(platform);
          }}
        />
      ))}
    </ul>
  );
}
