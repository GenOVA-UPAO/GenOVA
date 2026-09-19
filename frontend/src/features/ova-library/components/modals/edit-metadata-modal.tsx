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
import { Input } from "@/core/components/ui/input";
import { Label } from "@/core/components/ui/label";
import { Textarea } from "@/core/components/ui/textarea";

import { type MetadataInput, metadataSchema } from "../../lib/metadata-schema";

interface EditMetadataModalProps {
  initial: {
    title: string;
    description?: string;
  };
  isLoading?: boolean;
  onSave: (data: MetadataInput) => void;
  onCancel: () => void;
}

/** Modal para editar título y descripción de un OVA con validación Zod. */
export function EditMetadataModal({
  initial,
  isLoading = false,
  onSave,
  onCancel,
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
      <DialogContent className="sm:max-w-md" showCloseButton={!isLoading}>
        <DialogHeader>
          <DialogTitle>Editar metadatos</DialogTitle>
          <DialogDescription>Actualiza el título y descripción del OVA.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="metadata-title">Título *</Label>
            <Input
              id="metadata-title"
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (error) setError(null);
              }}
              placeholder="Ej. Regresión lineal aplicada"
              disabled={isLoading}
              aria-invalid={Boolean(error)}
            />
            <p className="text-[11px] text-muted-foreground">{String(title.length)}/100</p>
            {error && <p className="text-xs font-medium text-destructive">{error}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="metadata-description">Descripción</Label>
            <Textarea
              id="metadata-description"
              rows={4}
              value={description}
              onChange={(e) => { setDescription(e.target.value); }}
              placeholder="Opcional"
              disabled={isLoading}
              className="resize-none"
            />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onCancel} disabled={isLoading}>
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" loading={isLoading} disabled={isLoading}>
              {isLoading ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
