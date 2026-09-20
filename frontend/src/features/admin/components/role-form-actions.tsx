import { Button } from "@/core/components/ui/button";
import { DialogFooter } from "@/core/components/ui/dialog";

interface RoleFormActionsProps {
  isSubmitting: boolean;
  canSubmit: boolean;
  submitLabel: string;
  onCancel: () => void;
}

export function RoleFormActions({
  isSubmitting,
  canSubmit,
  submitLabel,
  onCancel,
}: Readonly<RoleFormActionsProps>) {
  return (
    <DialogFooter>
      <Button variant="ghost" onClick={onCancel} disabled={isSubmitting}>
        Cancelar
      </Button>
      <Button type="submit" loading={isSubmitting} disabled={!canSubmit}>
        {submitLabel}
      </Button>
    </DialogFooter>
  );
}
