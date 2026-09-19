import { Input } from "@/core/components/ui/input";
import { Label } from "@/core/components/ui/label";
import { Textarea } from "@/core/components/ui/textarea";

const LABEL_CLASS = "text-xs font-bold uppercase tracking-wider text-muted-foreground";

interface RoleFormFieldsProps {
  name: string;
  description: string;
  disabled: boolean;
  onNameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
}

export function RoleFormFields({
  name,
  description,
  disabled,
  onNameChange,
  onDescriptionChange,
}: Readonly<RoleFormFieldsProps>) {
  return (
    <>
      <div className="space-y-1.5">
        <Label htmlFor="role-name-input" className={LABEL_CLASS}>
          Nombre del rol
        </Label>
        <Input
          id="role-name-input"
          type="text"
          placeholder="Ej. docente, supervisor..."
          value={name}
          disabled={disabled}
          onChange={(event) => {
            onNameChange(event.target.value);
          }}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="role-description-input" className={LABEL_CLASS}>
          Descripción (Opcional)
        </Label>
        <Textarea
          id="role-description-input"
          placeholder="Breve descripción del propósito de este rol..."
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
