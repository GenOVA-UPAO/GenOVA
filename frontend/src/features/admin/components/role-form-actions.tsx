import { Button } from "@/core/components/ui/button";
import { DialogFooter } from "@/core/components/ui/dialog";

interface RoleFormActionsProps {
  isSubmitting: boolean;
  submitLabel: string;
  onCancel: () => void;
}

export function RoleFormActions({
  isSubmitting,
  submitLabel,
  onCancel,
}: Readonly<RoleFormActionsProps>) {
  return (
    <DialogFooter>
      <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
        Cancelar
      </Button>
      <Button type="submit" loading={isSubmitting}>
        {submitLabel}
      </Button>
    </DialogFooter>
  );
}
