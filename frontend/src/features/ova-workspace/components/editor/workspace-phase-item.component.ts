import { CommonModule } from "@angular/common";
import { Component, EventEmitter, Input, Output } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { ButtonComponent } from "@/core/components/ui/button.component";
import type { PhaseWithContent } from "../../lib/types";
// We'll stub PhaseVersionHistoryComponent for now or implement it next
// import { PhaseVersionHistoryComponent } from '../versioning/phase-version-history.component';

@Component({
  selector: "gn-workspace-phase-item",
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonComponent],
  template: `
    <!-- PhaseVersionHistory component to go here when ported -->
    
    <div [class]="'rounded-md border border-border bg-muted/30 group ' + (isDragging ? 'opacity-50' : '')">
      <div class="flex items-start gap-2 p-2">
        <span
          class="mt-0.5 shrink-0 text-muted-foreground/50 group-hover:text-muted-foreground select-none cursor-grab active:cursor-grabbing"
          aria-hidden="true"
        >
          ⠿
        </span>
        <pre class="flex-1 text-xs overflow-auto max-h-28 whitespace-pre-wrap text-foreground/80 font-sans">
          {{ phase.content || '(sin contenido)' }}
        </pre>
        <div class="flex flex-col gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <gn-button
            type="button"
            size="sm"
            variant="ghost"
            class="h-5 px-1.5 text-[10px]"
            (click)="openEdit()"
            title="Editar contenido"
          >
            ✏
          </gn-button>
          <gn-button
            type="button"
            size="sm"
            variant="ghost"
            class="h-5 px-1.5 text-[10px]"
            (click)="openRegen()"
            title="Regenerar con prompt"
          >
            ↺
          </gn-button>
          <gn-button
            type="button"
            size="sm"
            variant="ghost"
            class="h-5 px-1.5 text-[10px] text-destructive hover:text-destructive"
            (click)="handleDelete()"
            title="Eliminar recurso"
          >
            🗑
          </gn-button>
          <gn-button
            type="button"
            size="sm"
            variant="ghost"
            class="h-5 px-1.5 text-[10px]"
            (click)="historyOpen = true"
            title="Historial micro-versiones"
          >
            ⏱
          </gn-button>
        </div>
      </div>

      <div *ngIf="mode" class="border-t border-border p-2 space-y-1.5">
        <p class="text-[10px] text-muted-foreground font-medium">
          {{ mode === 'edit' ? 'Editar contenido directamente:' : 'Prompt para regenerar:' }}
        </p>
        <textarea
          class="w-full rounded border border-border bg-background px-2 py-1.5 text-xs resize-y min-h-[60px] focus:outline-none focus:ring-1 focus:ring-ring"
          [(ngModel)]="text"
          [placeholder]="mode === 'edit' ? 'Escribe el contenido…' : 'Describe el cambio que quieres…'"
        ></textarea>
        <div class="flex gap-1.5">
          <gn-button
            type="button"
            size="sm"
            class="h-6 text-xs px-3"
            (click)="submit()"
          >
            Guardar
          </gn-button>
          <gn-button
            type="button"
            size="sm"
            variant="ghost"
            class="h-6 text-xs px-2"
            (click)="cancel()"
          >
            Cancelar
          </gn-button>
        </div>
      </div>
    </div>
  `,
})
export class WorkspacePhaseItemComponent {
  @Input() phase!: PhaseWithContent;
  @Input() isDragging = false;
  @Input() ovaId!: string;

  @Output() onEdit = new EventEmitter<{ phaseId: string; content: string }>();
  @Output() onRegen = new EventEmitter<{ phaseId: string; prompt?: string }>();
  @Output() onDelete = new EventEmitter<string>();
  @Output() onReverted = new EventEmitter<void>();

  historyOpen = false;
  mode: "edit" | "regen" | null = null;
  text = "";

  openEdit() {
    this.mode = "edit";
    this.text = this.phase.content || "";
  }

  openRegen() {
    this.mode = "regen";
    this.text = "";
  }

  cancel() {
    this.mode = null;
    this.text = "";
  }

  submit() {
    if (this.mode === "edit") {
      this.onEdit.emit({ phaseId: this.phase.id, content: this.text });
    } else if (this.mode === "regen") {
      this.onRegen.emit({ phaseId: this.phase.id, prompt: this.text });
    }
    this.cancel();
  }

  handleDelete() {
    if (window.confirm("¿Eliminar este recurso?")) {
      this.onDelete.emit(this.phase.id);
    }
  }
}
