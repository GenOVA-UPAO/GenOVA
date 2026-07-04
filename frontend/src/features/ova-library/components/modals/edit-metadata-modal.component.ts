import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  type OnInit,
  output,
  signal,
} from "@angular/core";
import { form, FormField, maxLength, required } from "@angular/forms/signals";
import { HlmInput } from "@spartan-ng/helm/input";

import { ButtonComponent } from "@/core/components/ui/button.component";
import { DialogComponent } from "@/core/components/ui/dialog.component";
import type { MetadataInput } from "@/features/ova-library/lib/metadataSchema";

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: "gn-edit-metadata-modal",
  imports: [DialogComponent, FormField, ButtonComponent, HlmInput],
  template: `
    <gn-dialog
      [open]="true"
      width="32rem"
      [disableClose]="isLoading()"
      (openChange)="$event || onCancel.emit()"
    >
      <div class="p-6 bg-card">
        <h2 class="text-lg font-semibold tracking-tight">Editar metadatos</h2>
        <p class="text-xs text-muted-foreground mt-1 mb-4">
          Actualiza el título y descripción del OVA.
        </p>

        <form (submit)="onSubmit(); $event.preventDefault()" class="space-y-4">
          <div class="space-y-1.5">
            <label
              for="metadata-title"
              class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Título *
            </label>
            <input
              id="metadata-title"
              type="text"
              hlmInput
              class="w-full"
              placeholder="Ej. Regresión lineal aplicada"
              [formField]="metadataForm.title"
            />
            <p class="text-[11px] text-muted-foreground">{{ titleLength() }}/100</p>
            @if (metadataForm.title().touched() && metadataForm.title().errors().length) {
              <p class="text-xs font-medium text-destructive">
                El título es obligatorio y no puede superar 100 caracteres.
              </p>
            }
          </div>

          <div class="space-y-1.5">
            <label
              for="metadata-description"
              class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Descripción
            </label>
            <textarea
              id="metadata-description"
              rows="4"
              class="w-full flex min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
              placeholder="Opcional"
              [formField]="metadataForm.description"
            ></textarea>
          </div>

          <div
            class="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 pt-4 border-t border-border mt-4"
          >
            <gn-button
              type="button"
              variant="outline"
              class="flex-1 block"
              (onClick)="onCancel.emit()"
              [disabled]="isLoading()"
            >
              Cancelar
            </gn-button>
            <gn-button
              type="submit"
              class="flex-1 block"
              [disabled]="isLoading() || metadataForm().invalid()"
              [loading]="isLoading()"
            >
              {{ isLoading() ? "Guardando..." : "Guardar" }}
            </gn-button>
          </div>
        </form>
      </div>
    </gn-dialog>
  `,
})
export class EditMetadataModalComponent implements OnInit {
  readonly initial = input.required<{
    title: string;
    description?: string;
  }>();
  readonly isLoading = input(false);

  readonly onSave = output<MetadataInput>();
  readonly onCancel = output();

  protected readonly metadataModel = signal({ title: "", description: "" });
  protected readonly metadataForm = form(this.metadataModel, (p) => {
    required(p.title, { message: "El título es obligatorio." });
    maxLength(p.title, 100, { message: "El título no puede superar 100 caracteres." });
    maxLength(p.description, 2000, { message: "La descripción no puede superar 2000 caracteres." });
  });

  protected readonly titleLength = computed(() => this.metadataModel().title.length);

  ngOnInit() {
    this.metadataModel.set({
      title: this.initial()?.title || "",
      description: this.initial()?.description || "",
    });
  }

  onSubmit() {
    if (this.metadataForm().valid()) {
      this.onSave.emit(this.metadataModel());
    }
  }
}
