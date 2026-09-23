import { Input } from "@/core/components/ui/input";
import { Label } from "@/core/components/ui/label";

interface MetadataTitleFieldProps {
  value: string;
  maxLength: number;
  error: string | null;
  disabled?: boolean;
  onChange: (value: string) => void;
}

/** Campo «Título» con contador y error debajo (enlazados con aria-describedby). */
export function MetadataTitleField({
  value,
  maxLength,
  error,
  disabled = false,
  onChange,
}: Readonly<MetadataTitleFieldProps>) {
  return (
    <div className="grid gap-2">
      <Label htmlFor="metadata-title">Título</Label>
      <Input
        id="metadata-title"
        type="text"
        value={value}
        maxLength={maxLength}
        onChange={(e) => {
          onChange(e.target.value);
        }}
        placeholder="Ej.: Regresión lineal aplicada"
        disabled={disabled}
        required
        aria-invalid={Boolean(error)}
        aria-describedby="metadata-title-hint"
      />
      <div id="metadata-title-hint" className="flex items-start justify-between gap-3 text-xs">
        {error ? (
          <p role="alert" className="font-medium text-destructive">{error}</p>
        ) : (
          <p className="text-muted-foreground">Obligatorio.</p>
        )}
        <p className="shrink-0 text-muted-foreground tabular-nums">
          {value.length}/{maxLength}
        </p>
      </div>
    </div>
  );
}
