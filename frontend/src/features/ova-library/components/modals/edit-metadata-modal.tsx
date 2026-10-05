import { Button } from "@/core/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/core/components/ui/dialog";
import { Label } from "@/core/components/ui/label";
import { Textarea } from "@/core/components/ui/textarea";
import type { EducationalMetadata } from "@/core/lib/educational-metadata";

import { useMetadataForm } from "../../hooks/use-metadata-form";
import type { MetadataInput } from "../../lib/metadata-schema";
import { EducationalMetadataFields } from "./educational-metadata-fields";
import { MetadataDiscardDialog } from "./metadata-discard-dialog";
import { MetadataTitleField } from "./metadata-title-field";

interface EditMetadataModalProps {
  initial: EducationalMetadata & {
    title: string;
    description?: string;
  };
  isLoading?: boolean;
  onSave: (data: MetadataInput) => void;
  onCancel: () => void;
  /** Dónde dejar el foco al cerrar (por defecto, lo decide Radix). */
  onCloseAutoFocus?: (event: Event) => void;
}

const TITLE_MAX = 100;

/** Metadatos educativos y licencia del OVA, con validación accesible. */
export function EditMetadataModal({
  initial,
  isLoading = false,
  onSave,
  onCancel,
  onCloseAutoFocus,
}: Readonly<EditMetadataModalProps>) {
  const f = useMetadataForm(initial, onSave, onCancel);

  return (
    <Dialog open onOpenChange={(open) => { if (!open && !isLoading) f.requestCancel(); }}>
      <DialogContent
        className="max-h-[90dvh] overflow-y-auto sm:max-w-lg"
        showCloseButton={!isLoading}
        onCloseAutoFocus={onCloseAutoFocus}
      >
        <DialogHeader className="pr-8">
          <DialogTitle>Editar metadatos del OVA</DialogTitle>
          <DialogDescription>Define cómo aparece y cómo se puede reutilizar tu material educativo.</DialogDescription>
        </DialogHeader>

        <form onSubmit={f.handleSubmit} noValidate className="grid gap-5">
          <MetadataTitleField
            value={f.values.title}
            maxLength={TITLE_MAX}
            error={f.errors.title ?? null}
            disabled={isLoading}
            onChange={(value) => { f.onChange("title", value); }}
          />

          <div className="grid gap-2">
            <Label htmlFor="metadata-description">
              Descripción <span className="font-normal text-muted-foreground">(opcional)</span>
            </Label>
            <Textarea
              id="metadata-description"
              rows={4}
              value={f.values.description}
              onChange={(e) => { f.onChange("description", e.target.value); }}
              disabled={isLoading}
              className="resize-none"
              maxLength={2000}
              aria-invalid={Boolean(f.errors.description)}
              aria-describedby="metadata-description-hint"
            />
            <p id="metadata-description-hint" className="text-xs text-muted-foreground">{f.errors.description ?? "Hasta 2000 caracteres."}</p>
          </div>

          <EducationalMetadataFields values={f.values} keywords={f.keywords} disabled={isLoading} errors={f.errors} onChange={f.onChange} />
          <p className="text-xs text-muted-foreground">Los cambios viajan al exportar. El paquete SCORM 1.2 guardado se actualiza al regenerar el OVA o guardar un recurso en el editor.</p>
          {f.error && <p role="alert" className="text-sm text-destructive">{f.error}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={f.requestCancel} disabled={isLoading}>
              Cancelar
            </Button>
            <Button type="submit" loading={isLoading}>
              {isLoading ? "Guardando…" : "Guardar cambios"}
            </Button>
          </DialogFooter>
        </form>
        <MetadataDiscardDialog open={f.discardOpen} onOpenChange={f.setDiscardOpen} onDiscard={onCancel} />
      </DialogContent>
    </Dialog>
  );
}
