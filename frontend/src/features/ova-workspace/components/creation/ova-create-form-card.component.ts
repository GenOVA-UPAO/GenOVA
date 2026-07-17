import { ChangeDetectionStrategy, Component, computed, input, output, signal } from "@angular/core";

import { IconComponent } from "@/core/components/icon.component";
import { ButtonComponent } from "@/core/components/ui/button.component";

import type { OvaTheme } from "../../lib/types";
import type { UploadsProps } from "../../lib/uploadTypes";
import { MIN_PHASES_WITH_RESOURCES } from "../../services/ova-creation-flow.service";
import { OvaFilesModalComponent } from "../modals/ova-files-modal.component";
import { OvaThemeModalComponent } from "../modals/ova-theme-modal.component";
import { FileChipComponent } from "../shared/file-chip.component";

export const EXAMPLE_PROMPT =
  "Tema: Fotosíntesis en plantas.\n" +
  "Objetivos: Explicar el proceso de fotosíntesis y su importancia para el ecosistema.\n" +
  "Nivel educativo: Secundaria (3er año).";

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: "gn-ova-create-form-card",
  imports: [
    ButtonComponent,
    FileChipComponent,
    IconComponent,
    OvaFilesModalComponent,
    OvaThemeModalComponent,
  ],
  templateUrl: "./ova-create-form-card.component.html",
})
export class OvaCreateFormCardComponent {
  readonly prompt = input("");
  readonly minChars = input(10);
  readonly canGenerate = input(false);
  readonly totalResources = input(0);
  readonly phasesWithResources = input(0);
  readonly selections = input<Record<string, unknown[]>>({});
  readonly theme = input<OvaTheme>({ color: "upao", design: "upao" });
  readonly error = input("");
  readonly uploadsProps = input.required<UploadsProps>();

  readonly promptChange = output<string>();
  readonly openModal = output();
  readonly generate = output();
  readonly themeChange = output<OvaTheme>();
  readonly replayTour = output();
  /** Emitido cuando se abre "Archivos" o "Tema" — el padre debe cerrar el picker 5E si estaba abierto. */
  readonly closePicker = output();

  readonly exampleId = EXAMPLE_PROMPT;

  // Signals (no booleanos planos): en zoneless/OnPush, mutar un campo plano
  // puede desincronizarse del binding [open] del hijo (gn-dialog CDK) cuando
  // este cierra por su cuenta (Esc/backdrop) — ver CR-02.
  readonly showFiles = signal(false);
  readonly showTheme = signal(false);

  /** Exclusión mutua: abrir Archivos cierra Tema (y el picker 5E). */
  openFiles(): void {
    this.showTheme.set(false);
    this.showFiles.set(true);
    this.closePicker.emit();
  }

  /** Exclusión mutua: abrir Tema cierra Archivos (y el picker 5E). */
  openTheme(): void {
    this.showFiles.set(false);
    this.showTheme.set(true);
    this.closePicker.emit();
  }

  get themeLabel() {
    const color = this.theme().color === "free" ? "Libre" : "UPAO";
    const design = this.theme().design === "free" ? "Libre" : "UPAO";
    return `Color: ${color} · Diseño: ${design}`;
  }

  get resourceSummary() {
    if (this.totalResources() <= 0) return null;
    return Object.entries(this.selections())
      .filter(([, v]) => v.length > 0)
      .map(([k, v]) => `${k} (${v.length})`)
      .join(" · ");
  }

  readonly missingChars = computed(() =>
    Math.max(0, this.minChars() - this.prompt().trim().length),
  );

  readonly missingPhases = computed(() =>
    Math.max(0, MIN_PHASES_WITH_RESOURCES - this.phasesWithResources()),
  );

  readonly needsMorePhases = computed(() => this.missingChars() === 0 && this.missingPhases() > 0);

  handleKeydown(e: KeyboardEvent) {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey) && this.canGenerate()) this.generate.emit();
  }

  handleDrop(e: DragEvent) {
    e.preventDefault();
    if (e.dataTransfer?.files?.length) this.uploadsProps().onFilesSelected(e.dataTransfer.files);
  }

  handleFileChange(e: Event) {
    const input = e.target as HTMLInputElement;
    if (input.files) this.uploadsProps().onFilesSelected(input.files);
    input.value = "";
  }

  useExample() {
    this.promptChange.emit(EXAMPLE_PROMPT);
  }
}
