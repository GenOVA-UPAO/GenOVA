import { ChangeDetectionStrategy, Component, computed, input, output, signal } from "@angular/core";

import { IconComponent } from "@/core/components/icon.component";
import { ButtonComponent } from "@/core/components/ui/button.component";

import type { OvaTheme } from "../../lib/types";
import type { UploadsProps } from "../../lib/uploadTypes";
import { MIN_PHASES_WITH_RESOURCES } from "../../services/ova-creation-flow.service";
import { OvaFilesModalComponent } from "../modals/ova-files-modal.component";
import { OvaThemeModalComponent } from "../modals/ova-theme-modal.component";
import { FileChipComponent } from "../shared/file-chip.component";

/** Ejemplos de prompt: solo machine learning de nivel universitario. */
export const EXAMPLE_PROMPTS = [
  "Tema: Aprendizaje supervisado y no supervisado en machine learning.\n" +
    "Objetivos: Distinguir ambos paradigmas, describir algoritmos representativos (regresión lineal, árboles, k-means) y plantear un caso de aplicación con datos tabulares.\n" +
    "Nivel educativo: Universitario (pregrado en Ingeniería / Ciencia de Datos).",
  "Tema: Redes neuronales artificiales y backpropagation.\n" +
    "Objetivos: Explicar la arquitectura de un perceptrón multicapa, el rol de la función de activación y cómo el descenso de gradiente ajusta los pesos mediante backpropagation.\n" +
    "Nivel educativo: Universitario (pregrado en Ingeniería / Ciencia de Datos).",
  "Tema: Overfitting, underfitting y validación de modelos de ML.\n" +
    "Objetivos: Identificar síntomas de sobreajuste y subajuste, aplicar train/validation/test split y cross-validation, y proponer regularización (L2, dropout) según el caso.\n" +
    "Nivel educativo: Universitario (pregrado en Ingeniería / Ciencia de Datos).",
  "Tema: Evaluación de clasificadores: métricas y matrices de confusión.\n" +
    "Objetivos: Interpretar accuracy, precision, recall y F1; construir una matriz de confusión; y elegir la métrica adecuada ante clases desbalanceadas.\n" +
    "Nivel educativo: Universitario (pregrado en Ingeniería / Ciencia de Datos).",
] as const;

/** Primer ejemplo — compatibilidad con tests y referencias existentes. */
export const EXAMPLE_PROMPT = EXAMPLE_PROMPTS[0];

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
  private exampleIndex = 0;

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

  /** Stepper: texto mínimo cumplido. */
  readonly stepDescribeDone = computed(() => this.missingChars() === 0);

  /** Stepper: ≥1 recurso en al menos MIN_PHASES fases. */
  readonly stepResourcesDone = computed(() => this.missingPhases() === 0);

  /** Stepper: listo para generar (parpadea el paso 3). */
  readonly stepGenerateReady = computed(() => this.canGenerate());

  stepCircleClass(active: boolean, pulse = false): string {
    const base =
      "flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm font-semibold shadow-sm transition-colors";
    if (pulse) {
      return `${base} border-primary bg-primary text-primary-foreground animate-pulse`;
    }
    if (active) {
      return `${base} border-primary bg-primary/10 text-primary`;
    }
    return `${base} border-border bg-muted/50 text-muted-foreground`;
  }

  stepLabelClass(active: boolean, pulse = false): string {
    if (pulse) return "text-xs font-semibold text-primary animate-pulse";
    if (active) return "text-xs font-medium text-foreground";
    return "text-xs font-medium text-muted-foreground";
  }

  stepLineClass(active: boolean): string {
    return active
      ? "mb-5 h-px w-6 shrink-0 bg-primary/50 sm:w-10"
      : "mb-5 h-px w-6 shrink-0 bg-border sm:w-10";
  }

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
    const next = EXAMPLE_PROMPTS[this.exampleIndex % EXAMPLE_PROMPTS.length];
    this.exampleIndex += 1;
    this.promptChange.emit(next);
  }
}
