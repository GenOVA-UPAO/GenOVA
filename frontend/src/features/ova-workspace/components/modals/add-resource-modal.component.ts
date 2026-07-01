import { CommonModule } from "@angular/common";
import { Component, EventEmitter, Input, Output } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { ButtonComponent } from "@/core/components/ui/button.component";
import {
  DialogComponent,
  DialogContentComponent,
  DialogDescriptionComponent,
  DialogFooterComponent,
  DialogHeaderComponent,
  DialogTitleComponent,
} from "@/core/components/ui/dialog.component";

const MAX_PHASES_PER_TYPE = 4;

@Component({
  selector: "gn-add-resource-modal",
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DialogComponent,
    DialogContentComponent,
    DialogHeaderComponent,
    DialogFooterComponent,
    DialogTitleComponent,
    DialogDescriptionComponent,
    ButtonComponent,
  ],
  template: `
    <gn-dialog [open]="open" (openChange)="onOpenChange.emit($event)">
      <gn-dialog-content class="max-w-md">
        <gn-dialog-header>
          <gn-dialog-title>Añadir recurso — <span class="capitalize">{{ phaseType }}</span></gn-dialog-title>
          <gn-dialog-description>
            <ng-container *ngIf="isFull">
              Esta fase ya tiene el máximo de {{ MAX_PHASES_PER_TYPE }} recursos.
            </ng-container>
            <ng-container *ngIf="!isFull">
              Describe el nuevo recurso para la fase "{{ phaseType }}" ({{ currentCount }}/{{ MAX_PHASES_PER_TYPE }}).
            </ng-container>
          </gn-dialog-description>
        </gn-dialog-header>

        <div *ngIf="!isFull" class="space-y-3 py-1">
          <textarea
            class="w-full rounded-md border border-border bg-background px-3 py-2 text-sm resize-y min-h-[80px] focus:outline-none focus:ring-2 focus:ring-ring"
            [placeholder]="'Ej: Añade un ejemplo práctico de ' + phaseType + ' con código Python'"
            [(ngModel)]="prompt"
            [disabled]="loading"
            (keydown)="handleKeyDown($event)"
          ></textarea>
          <p class="text-[10px] text-muted-foreground">
            Ctrl+Enter para guardar
          </p>
        </div>

        <gn-dialog-footer>
          <gn-button
            type="button"
            variant="ghost"
            (click)="onOpenChange.emit(false)"
          >
            Cancelar
          </gn-button>
          <gn-button
            *ngIf="!isFull"
            type="button"
            [disabled]="!prompt.trim() || loading"
            (click)="handleSubmit()"
          >
            {{ loading ? 'Añadiendo…' : 'Añadir recurso' }}
          </gn-button>
        </gn-dialog-footer>
      </gn-dialog-content>
    </gn-dialog>
  `,
})
export class AddResourceModalComponent {
  @Input() open = false;
  @Input() phaseType = "";
  @Input() currentCount = 0;

  @Output() onOpenChange = new EventEmitter<boolean>();
  @Output() onAdd = new EventEmitter<{ phaseType: string; prompt: string }>();

  MAX_PHASES_PER_TYPE = MAX_PHASES_PER_TYPE;
  prompt = "";
  loading = false;

  get isFull() {
    return this.currentCount >= this.MAX_PHASES_PER_TYPE;
  }

  handleKeyDown(e: KeyboardEvent) {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      this.handleSubmit();
    }
  }

  async handleSubmit() {
    if (!this.prompt.trim() || this.loading || this.isFull) return;
    this.loading = true;
    try {
      this.onAdd.emit({ phaseType: this.phaseType, prompt: this.prompt.trim() });
      this.prompt = "";
      this.onOpenChange.emit(false);
    } finally {
      // Small timeout to allow animation before disabling loading visually
      setTimeout(() => (this.loading = false), 300);
    }
  }
}
