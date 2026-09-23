import { Input } from "@/core/components/ui/input";
import { Label } from "@/core/components/ui/label";
import { Textarea } from "@/core/components/ui/textarea";

interface RoleFormFieldsProps {
  name: string;
  nameError: string;
  description: string;
  disabled: boolean;
  onNameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
}

export function RoleFormFields({
  name,
  nameError,
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
            Un nombre corto y único, por ejemplo «docente».
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
