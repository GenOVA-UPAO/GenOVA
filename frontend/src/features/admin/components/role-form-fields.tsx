import { Input } from "@/core/components/ui/input";
import { Label } from "@/core/components/ui/label";
import { Textarea } from "@/core/components/ui/textarea";

interface RoleFormFieldsProps {
  name: string;
  nameError: string;
  /** Motivo por el que el nombre no se puede cambiar; `null` si se puede. */
  nameLockReason: string | null;
  description: string;
  disabled: boolean;
  onNameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
}

export function RoleFormFields({
  name,
  nameError,
  nameLockReason,
  description,
  disabled,
  onNameChange,
  onDescriptionChange,
}: Readonly<RoleFormFieldsProps>) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="role-name-input">Nombre del rol</Label>
        <Input
          id="role-name-input"
          type="text"
          autoComplete="off"
          value={name}
          disabled={disabled}
          readOnly={nameLockReason !== null}
          // Bloqueado, no recibe el foco inicial del diálogo (parecería editable).
          tabIndex={nameLockReason === null ? undefined : -1}
          className="read-only:bg-muted read-only:text-muted-foreground"
          aria-invalid={nameError !== "" || undefined}
          aria-describedby={nameError !== "" ? "role-name-error" : "role-name-help"}
          onChange={(event) => {
            onNameChange(event.target.value);
          }}
        />
        {nameError !== "" ? (
          <p id="role-name-error" className="text-xs text-destructive">
            {nameError}
          </p>
        ) : (
          <p id="role-name-help" className="text-xs text-muted-foreground">
            {nameLockReason ?? "Un nombre corto y único, por ejemplo «docente»."}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="role-description-input">Descripción (opcional)</Label>
        <Textarea
          id="role-description-input"
          value={description}
          disabled={disabled}
          rows={2}
          className="resize-none"
          onChange={(event) => {
            onDescriptionChange(event.target.value);
          }}
        />
      </div>
    </>
  );
}
