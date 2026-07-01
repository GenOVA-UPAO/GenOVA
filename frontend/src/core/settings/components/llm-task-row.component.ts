import { CommonModule } from "@angular/common";
import { Component, EventEmitter, Input, Output } from "@angular/core";
import {
  addFallback,
  type Entry,
  moveFallback,
  removeFallback,
  setFallback,
} from "../lib/llmConfigDraft";
import { LlmModelSelectComponent } from "./llm-model-select.component";

@Component({
  selector: "gn-llm-task-row",
  standalone: true,
  imports: [CommonModule, LlmModelSelectComponent],
  template: `
    <div class="rounded-3xl border border-border bg-card overflow-hidden glass-card shadow-sm hover:border-primary/20 transition">
      <div class="px-6 py-5 border-b border-border/50 bg-muted/20">
        <div class="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div>
            <h3 class="text-base font-bold text-foreground font-display">{{ taskLabel }}</h3>
            <p class="text-[11px] font-medium text-muted-foreground mt-1 leading-snug">{{ taskDesc }}</p>
          </div>
          <span class="shrink-0 rounded-md bg-primary/10 px-2 py-1 text-[10px] font-bold text-primary border border-primary/20 uppercase tracking-widest self-start">
            {{ fallbacks.length }} fallback{{ fallbacks.length === 1 ? '' : 's' }}
          </span>
        </div>
      </div>

      <div class="p-6 space-y-6">
        <div class="block space-y-3">
          <div class="flex items-center gap-2">
            <span class="shrink-0 rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 border border-emerald-500/20 tracking-widest uppercase">
              Primario
            </span>
            <span class="text-xs font-bold text-foreground">Modelo principal</span>
          </div>
          <gn-llm-model-select
            [models]="models"
            [provider]="value.default?.provider"
            [modelId]="value.default?.model_id"
            [disabled]="disabled"
            [ariaLabel]="'Modelo primario de ' + task"
            (onChange)="setDefault($event.provider, $event.modelId)"
          ></gn-llm-model-select>
        </div>

        <div class="space-y-4">
          <span class="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            Cadena de fallback
          </span>
          <p *ngIf="fallbacks.length === 0" class="text-xs font-medium text-muted-foreground/80 bg-muted/30 p-4 rounded-2xl border border-border/50 text-center italic">
            No hay modelos de respaldo configurados. Si el primario falla, se detendrá la tarea.
          </p>
          
          <div
            *ngFor="let f of fallbacks; let i = index"
            class="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-2xl border transition shadow-sm"
            [ngClass]="disabled ? 'border-border/50 bg-muted/20' : 'border-border bg-card/50 hover:bg-accent/30'"
          >
            <div class="flex items-center gap-2 shrink-0">
              <span class="text-[10px] font-bold text-muted-foreground/60 bg-muted px-2 py-1 rounded-md border border-border">
                #{{ i + 1 }}
              </span>
              <span *ngIf="getModality(f) !== 'text'" class="inline-flex items-center gap-0.5 rounded-full border border-purple-200 bg-purple-50 px-1.5 py-0.5 text-[9px] font-bold text-purple-600">
                {{ getModalitySymbol(getModality(f)) }}
              </span>
              <span *ngIf="i > 0" class="hidden sm:inline text-[10px] text-muted-foreground/30 font-black">←</span>
            </div>
            
            <div class="flex-1 min-w-0">
              <gn-llm-model-select
                [models]="models"
                [provider]="f.provider"
                [modelId]="f.model_id"
                [disabled]="disabled"
                [ariaLabel]="'Fallback ' + (i + 1) + ' de ' + task"
                (onChange)="setFallback(i, $event.provider, $event.modelId)"
              ></gn-llm-model-select>
            </div>
            
            <div class="flex items-center justify-end gap-2 shrink-0 sm:ml-2">
              <span class="text-[10px] font-bold text-muted-foreground/60 bg-muted px-2 py-1 rounded-md border border-border sm:hidden mr-auto">
                #{{ i + 1 }}
              </span>
              
              <button
                type="button"
                title="Subir"
                (click)="move(i, -1)"
                [disabled]="disabled || i === 0"
                class="p-1.5 rounded-xl border border-border/50 text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-30 transition-colors shadow-sm bg-card/50 backdrop-blur-sm"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 256 256"><path d="M213.66,165.66a8,8,0,0,1-11.32,0L128,91.31,53.66,165.66a8,8,0,0,1-11.32-11.32l80-80a8,8,0,0,1,11.32,0l80,80A8,8,0,0,1,213.66,165.66Z"></path></svg>
              </button>
              
              <button
                type="button"
                title="Bajar"
                (click)="move(i, 1)"
                [disabled]="disabled || i === fallbacks.length - 1"
                class="p-1.5 rounded-xl border border-border/50 text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-30 transition-colors shadow-sm bg-card/50 backdrop-blur-sm"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 256 256"><path d="M213.66,101.66l-80,80a8,8,0,0,1-11.32,0l-80-80A8,8,0,0,1,53.66,90.34L128,164.69l74.34-74.35a8,8,0,0,1,11.32,11.32Z"></path></svg>
              </button>
              
              <button
                type="button"
                title="Quitar"
                (click)="removeFallback(i)"
                [disabled]="disabled"
                class="p-1.5 rounded-xl border border-destructive/30 text-destructive hover:bg-destructive/10 disabled:opacity-30 transition-colors shadow-sm ml-1 bg-destructive/5"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 256 256"><path d="M216,48H176V40a24,24,0,0,0-24-24H104A24,24,0,0,0,80,40v8H40a8,8,0,0,0,0,16h8V208a16,16,0,0,0,16,16H192a16,16,0,0,0,16-16V64h8a8,8,0,0,0,0-16ZM96,40a8,8,0,0,1,8-8h48a8,8,0,0,1,8,8v8H96Zm96,168H64V64H192ZM112,104v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Zm48,0v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Z"></path></svg>
              </button>
            </div>
          </div>
          
          <div class="pt-2">
            <button
              type="button"
              (click)="addFallback()"
              [disabled]="disabled"
              class="inline-flex items-center justify-center rounded-md transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-background text-foreground hover:bg-accent w-full text-xs font-bold shadow-sm border border-dashed border-border py-5 hover:text-primary hover:border-primary/30"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 256 256" class="mr-2"><path d="M224,128a8,8,0,0,1-8,8H136v80a8,8,0,0,1-16,0V136H40a8,8,0,0,1,0-16h80V40a8,8,0,0,1,16,0v80h80A8,8,0,0,1,224,128Z"></path></svg>
              Añadir modelo de respaldo
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class LlmTaskRowComponent {
  @Input({ required: true }) task!: string;
  @Input({ required: true }) value!: { default?: Entry; fallbacks?: Entry[] };
  @Input({ required: true }) models!: Array<{
    provider: string;
    model_id: string;
    label?: string;
    modality?: string;
    context_length?: number;
    pricing?: string;
  }>;
  @Input() disabled = false;

  @Output() onChange = new EventEmitter<{ default?: Entry; fallbacks?: Entry[] }>();

  private TASK_LABELS: Record<string, string> = {
    texto: "Texto (Generación OVA)",
    codigo: "Código (HTML)",
    orquestador: "Orquestador (Planificación)",
    razonamiento: "Razonamiento",
  };

  private TASK_DESCS: Record<string, string> = {
    texto: "Modelo principal utilizado para generar el contenido de los recursos educativos.",
    codigo: "Especializado en generar estructuras HTML y recursos interactivos SCORM.",
    orquestador: "Coordina los agentes secundarios para la generación paso a paso.",
    razonamiento: "Se utiliza para evaluaciones complejas o toma de decisiones semánticas.",
  };

  get taskLabel(): string {
    return this.TASK_LABELS[this.task] ?? this.task;
  }

  get taskDesc(): string {
    return this.TASK_DESCS[this.task] ?? "Configuración de modelos de IA";
  }

  get fallbacks(): Entry[] {
    return this.value.fallbacks ?? [];
  }

  getModality(f: Entry): string {
    const fbModel = this.models.find((m) => m.provider === f.provider && m.model_id === f.model_id);
    return fbModel?.modality || "text";
  }

  getModalitySymbol(modality: string): string {
    const symbols: Record<string, string> = {
      text: "Aa",
      multimodal: "◆",
      image: "◇",
      audio: "♪",
    };
    return symbols[modality] || "Aa";
  }

  setDefault(provider: string, modelId: string) {
    this.onChange.emit({
      ...this.value,
      default: { ...this.value.default, provider, model_id: modelId },
    });
  }

  setFallback(i: number, provider: string, modelId: string) {
    this.onChange.emit({
      ...this.value,
      fallbacks: setFallback(this.fallbacks, i, provider, modelId),
    });
  }

  addFallback() {
    this.onChange.emit({
      ...this.value,
      fallbacks: addFallback(this.fallbacks),
    });
  }

  removeFallback(i: number) {
    this.onChange.emit({
      ...this.value,
      fallbacks: removeFallback(this.fallbacks, i),
    });
  }

  move(i: number, dir: number) {
    this.onChange.emit({
      ...this.value,
      fallbacks: moveFallback(this.fallbacks, i, dir),
    });
  }
}
