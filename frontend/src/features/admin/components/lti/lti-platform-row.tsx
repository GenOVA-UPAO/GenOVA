import { Icon } from "@/core/components/icon";
import { Badge } from "@/core/components/ui/badge";
import { Button } from "@/core/components/ui/button";

import type { LtiPlatform } from "../../api/admin-lti.api";

function deploymentsLabel(count: number): string {
  return count === 1 ? "1 deployment" : `${String(count)} deployments`;
}

export function PlatformRow({
  platform,
  onEdit,
  onDelete,
}: Readonly<{ platform: LtiPlatform; onEdit: () => void; onDelete: () => void }>) {
  return (
    <li
      data-testid="lti-platform-row"
      className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="truncate font-medium">{platform.name}</h3>
          <Badge variant={platform.is_active ? "secondary" : "outline"}>
            {platform.is_active ? "Activa" : "Desactivada"}
          </Badge>
        </div>
        <p className="mt-1 text-sm break-all text-muted-foreground">{platform.issuer}</p>
        <p className="text-xs text-muted-foreground tabular-nums">
          Client ID {platform.client_id} · {deploymentsLabel(platform.deployment_ids.length)}
        </p>
      </div>
      <div className="flex shrink-0 gap-2">
        <Button variant="outline" className="max-md:h-11" onClick={onEdit}>
          <Icon name="pencil-simple" /> Editar
        </Button>
        <Button
          variant="destructive"
          className="max-md:h-11"
          aria-label={`Eliminar ${platform.name}`}
          onClick={onDelete}
        >
          <Icon name="trash" /> Eliminar
        </Button>
      </div>
    </li>
  );
}
