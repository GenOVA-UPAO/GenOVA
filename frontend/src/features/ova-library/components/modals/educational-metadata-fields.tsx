import { Input } from "@/core/components/ui/input";
import { Label } from "@/core/components/ui/label";
import { OVA_LICENSES } from "@/core/lib/educational-metadata";

import type { MetadataInput } from "../../lib/metadata-schema";

interface Props {
  values: MetadataInput;
  keywords: string;
  disabled: boolean;
  errors: Partial<Record<keyof MetadataInput, string>>;
  onChange: (name: keyof MetadataInput, value: string) => void;
}

const FIELDS = [
  { name: "author", label: "Autor", hint: "Si lo dejas vacío, se usa el nombre del dueño." },
  { name: "language", label: "Idioma", hint: "Código de idioma: es, es-PE, en…" },
  { name: "keywords", label: "Palabras clave", hint: "Separadas por comas; hasta 30 palabras clave." },
  { name: "educational_level", label: "Nivel educativo", hint: "Por ejemplo: educación superior." },
  { name: "audience", label: "Público destinatario", hint: "Por ejemplo: estudiantes de primer ciclo." },
  { name: "typical_learning_time", label: "Tiempo típico de aprendizaje", hint: "PT30M = 30 minutos; PT1H30M = una hora y media." },
] as const;

export function EducationalMetadataFields({ values, keywords, disabled, errors, onChange }: Readonly<Props>) {
  return (
    <fieldset disabled={disabled} className="grid min-w-0 gap-4">
      <legend className="mb-3 text-sm font-medium">Licencia y datos educativos</legend>
      <div className="grid gap-2">
        <Label htmlFor="metadata-license">Licencia</Label>
        <select id="metadata-license" value={values.license} onChange={(event) => { onChange("license", event.target.value); }}
          aria-describedby="metadata-license-hint" className="h-11 w-full min-w-0 rounded-md border border-input bg-background px-3 text-sm focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50">
          {OVA_LICENSES.map((license) => <option key={license.value} value={license.value}>{license.value}</option>)}
        </select>
        <p id="metadata-license-hint" className="text-xs text-muted-foreground">
          {OVA_LICENSES.find((license) => license.value === values.license)?.description}
        </p>
      </div>
      {FIELDS.map(({ name, label, hint }) => (
        <div key={name} className="grid gap-2">
          <Label htmlFor={`metadata-${name}`}>{label}</Label>
          <Input id={`metadata-${name}`} value={name === "keywords" ? keywords : values[name]}
            onChange={(event) => { onChange(name, event.target.value); }} aria-invalid={Boolean(errors[name])}
            aria-describedby={`metadata-${name}-hint`} className="min-h-11" />
          <p id={`metadata-${name}-hint`} className={errors[name] ? "text-xs text-destructive" : "text-xs text-muted-foreground"}>
            {errors[name] ?? hint}
          </p>
        </div>
      ))}
    </fieldset>
  );
}
