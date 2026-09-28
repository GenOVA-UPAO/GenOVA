import { type SyntheticEvent, useState } from "react";

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

import { type MetadataInput, metadataSchema } from "../../lib/metadata-schema";
import { MetadataTitleField } from "./metadata-title-field";

interface EditMetadataModalProps {
  initial: {
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

/** Modal para editar el título y la descripción de un OVA (validación con Zod). */
export function EditMetadataModal({
  initial,
  isLoading = false,
  onSave,
  onCancel,
  onCloseAutoFocus,
}: Readonly<EditMetadataModalProps>) {
  const [title, setTitle] = useState(initial.title);
  const [description, setDescription] = useState(initial.description ?? "");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    const result = metadataSchema.safeParse({ title, description });
    if (!result.success) {
      setError(result.error.issues[0].message);
      return;
    }
    setError(null);
    onSave(result.data);
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open && !isLoading) onCancel(); }}>
      <DialogContent
        className="sm:max-w-lg"
        showCloseButton={!isLoading}
        onCloseAutoFocus={onCloseAutoFocus}
      >
        <DialogHeader className="pr-8">
          <DialogTitle>Editar título y descripción</DialogTitle>
          <DialogDescription>Así aparece el OVA en tu biblioteca.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} noValidate className="grid gap-5">
          <MetadataTitleField
            value={title}
            maxLength={TITLE_MAX}
            error={error}
            disabled={isLoading}
            onChange={(value) => {
              setTitle(value);
              if (error) setError(null);
            }}
          />

          <div className="grid gap-2">
            <Label htmlFor="metadata-description">
              Descripción <span className="font-normal text-muted-foreground">(opcional)</span>
            </Label>
            <Textarea
              id="metadata-description"
              rows={4}
              value={description}
              onChange={(e) => { setDescription(e.target.value); }}
              disabled={isLoading}
              className="resize-none"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
              Cancelar
            </Button>
            <Button type="submit" loading={isLoading}>
              {isLoading ? "Guardando..." : "Guardar cambios"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
