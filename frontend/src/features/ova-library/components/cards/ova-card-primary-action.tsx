import { Link, useNavigate } from "react-router";

import { Icon } from "@/core/components/icon";
import { Button } from "@/core/components/ui/button";

interface OvaCardPrimaryActionProps {
  ovaId: string;
  isGenerating: boolean;
  isInterrupted: boolean;
  /** OVA ajeno (el admin): se abre para verlo, no para editarlo. */
  canEdit?: boolean;
  className?: string;
  onResume?: (id: string) => void;
}

/** Acción principal: abrir el OVA en el editor o, si se está generando, seguir su progreso. */
export function OvaCardPrimaryAction({
  ovaId,
  isGenerating,
  isInterrupted,
  canEdit = true,
  className,
  onResume,
}: Readonly<OvaCardPrimaryActionProps>) {
  const navigate = useNavigate();
  const workspaceUrl = `/workspace/${ovaId}`;

  if (isGenerating && isInterrupted) {
    return (
      <Button
        variant="outline"
        className={className}
        onClick={() => {
          onResume?.(ovaId);
          void navigate(workspaceUrl);
        }}
      >
        <Icon name="arrow-clockwise" size="text-base" />
        Reanudar generación
      </Button>
    );
  }

  return (
    <Button asChild variant="outline" className={className}>
      <Link to={workspaceUrl}>
        <Icon name={openIcon(isGenerating, canEdit)} size="text-base" />
        {openLabel(isGenerating, canEdit)}
      </Link>
    </Button>
  );
}

function openLabel(isGenerating: boolean, canEdit: boolean): string {
  if (isGenerating) return "Ver progreso";
  return canEdit ? "Editar" : "Ver";
}

function openIcon(isGenerating: boolean, canEdit: boolean): string {
  if (isGenerating) return "clock";
  return canEdit ? "pencil-simple" : "eye";
}
