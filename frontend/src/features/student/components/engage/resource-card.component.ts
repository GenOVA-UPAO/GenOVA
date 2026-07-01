import { CommonModule } from "@angular/common";
import { Component, EventEmitter, Input, Output } from "@angular/core";
import type { Resource } from "../../lib/types";

const INTERACTIVIDAD_COLOR: Record<string, string> = {
  Alta: "bg-primary/10 text-primary",
  Media: "bg-accent-brand/10 text-accent-brand",
  Baja: "bg-muted text-muted-foreground",
};

@Component({
  selector: "gn-resource-card",
  standalone: true,
  imports: [CommonModule],
  template: `
    <button
      type="button"
      (click)="handleClick($event)"
      (mouseenter)="onHover.emit(resource)"
      (mouseleave)="onHover.emit(null)"
      (focus)="onHover.emit(resource)"
      (blur)="onHover.emit(null)"
      [attr.aria-pressed]="selected"
      [disabled]="disabled"
      class="text-left w-full rounded-xl border p-4 transition duration-150 cursor-pointer {{ getBaseClass() }}"
      [ngStyle]="getSelectedStyle()"
    >
      <div class="flex items-start gap-3">
        <div
          class="shrink-0 mt-0.5 p-1.5 rounded-lg"
          [style.backgroundColor]="phaseColor + '18'"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 256 256" [style.color]="phaseColor"><path d="M168,224H48V56A16,16,0,0,1,64,40h16v88a8,8,0,0,0,13.66,5.66L120,107.31l26.34,26.35A8,8,0,0,0,160,128V40h8a16,16,0,0,1,16,16V224Z" opacity="0.2"></path><path d="M216,56V224a16,16,0,0,1-16,16H48a16,16,0,0,1-16-16V56A24,24,0,0,1,56,32h16V24a8,8,0,0,1,16,0v8h56V24a8,8,0,0,1,16,0v8h8A24,24,0,0,1,216,56ZM152,48H96v76.69l18.34-18.35a8,8,0,0,1,11.32,0L144,124.69ZM48,224H184V56a8,8,0,0,0-8-8H168V128a16,16,0,0,1-27.31,11.31L120,118.63l-20.69,20.68A16,16,0,0,1,72,128V48H56a8,8,0,0,0-8,8Z"></path></svg>
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 flex-wrap">
            <span class="font-semibold text-foreground text-sm">
              {{ resource.tipo }}
            </span>
            <span
              class="text-xs font-medium px-1.5 py-0.5 rounded-full {{ getInteractividadColor() }}"
            >
              {{ resource.interactividad }}
            </span>
          </div>
          <span *ngIf="showVideoHint" class="text-xs text-amber-600 font-medium mt-1 block" title="Sin API key de video — generará prompt copiable">
            ⚠ Modo prompt
          </span>
        </div>
        <span
          *ngIf="selected"
          class="flex-shrink-0 inline-flex h-7 w-7 items-center justify-center rounded-full text-white text-xs font-bold"
          [style.backgroundColor]="phaseColor"
        >
          {{ selectionIndex ?? '✓' }}
        </span>
        <button
          *ngIf="hasConfig"
          type="button"
          (click)="handleConfigClick($event)"
          class="flex-shrink-0 p-1.5 rounded-md hover:bg-muted/60 transition-colors"
          title="Configurar recurso"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 256 256" [style.color]="phaseColor"><path d="M128,88a40,40,0,1,0,40,40A40,40,0,0,0,128,88Zm0,64a24,24,0,1,1,24-24A24,24,0,0,1,128,152Zm115.8-63.5-27-8.12a86.6,86.6,0,0,0-7.85-19L219,37a7.94,7.94,0,0,0-1.63-9.52l-15.9-15.89a7.92,7.92,0,0,0-9.52-1.62l-24.33,10a86.6,86.6,0,0,0-19-7.84l-8.13-27a8,8,0,0,0-7.66-5.71H120.37a8,8,0,0,0-7.65,5.71l-8.13,27A86.6,86.6,0,0,0,85.63,20.1L61.3,10.05a7.92,7.92,0,0,0-9.52,1.62L35.88,27.56A7.94,7.94,0,0,0,34.25,37l10,24.32a86.6,86.6,0,0,0-7.85,19l-27,8.12A8,8,0,0,0,4,96.12v23.76a8,8,0,0,0,5.43,7.66l27,8.12a86.6,86.6,0,0,0,7.85,19l-10,24.32a7.94,7.94,0,0,0,1.63,9.52l15.9,15.89a7.92,7.92,0,0,0,9.52,1.62l24.33-10a86.6,86.6,0,0,0,19,7.84l8.13,27A8,8,0,0,0,120.37,236h15.26a8,8,0,0,0,7.65-5.71l8.13-27a86.6,86.6,0,0,0,19-7.84l24.33,10a7.92,7.92,0,0,0,9.52-1.62l15.9-15.89a7.94,7.94,0,0,0,1.63-9.52l-10-24.32a86.6,86.6,0,0,0,7.85-19l27-8.12A8,8,0,0,0,252,119.88V96.12A8,8,0,0,0,243.8,88.5Zm-7.79,21.84-29.35,8.83a8,8,0,0,0-5.59,5.59A70.52,70.52,0,0,1,189.28,153a8,8,0,0,0-1,7.82l10.89,26.44-11.31,11.31-26.44-10.89a8,8,0,0,0-7.82,1A70.52,70.52,0,0,1,125.43,200.5a8,8,0,0,0-5.59,5.59l-8.83,29.35H101l-8.83-29.35a8,8,0,0,0-5.59-5.59A70.52,70.52,0,0,1,58.74,188.72a8,8,0,0,0-7.82-1L24.48,198.61,13.17,187.3l10.89-26.44a8,8,0,0,0-1-7.82A70.52,70.52,0,0,1,11.27,125.4a8,8,0,0,0-5.59-5.59L-23.67,111V97l29.35-8.83a8,8,0,0,0,5.59-5.59A70.52,70.52,0,0,1,22.72,79a8,8,0,0,0,1-7.82L12.84,44.75,24.15,33.44l26.44,10.89a8,8,0,0,0,7.82-1A70.52,70.52,0,0,1,86.57,31.5a8,8,0,0,0,5.59-5.59L101,3.44h10l8.83,29.35a8,8,0,0,0,5.59,5.59A70.52,70.52,0,0,1,173.26,43.28a8,8,0,0,0,7.82,1l26.44-10.89L218.83,44.7l-10.89,26.44a8,8,0,0,0,1,7.82A70.52,70.52,0,0,1,220.73,106.6a8,8,0,0,0,5.59,5.59l29.35,8.83Z"></path></svg>
        </button>
      </div>
    </button>
  `,
})
export class ResourceCardComponent {
  @Input({ required: true }) resource!: Resource;
  @Input() selected = false;
  @Input() phaseKey = "";
  @Input() phaseColor = "#3B82F6";
  @Input() selectionIndex: number | null = null;
  @Input() disabled = false;
  @Input() showVideoHint = false;
  @Input() hasConfig = false;

  @Output() onClick = new EventEmitter<Resource>();
  @Output() onHover = new EventEmitter<Resource | null>();
  @Output() onConfigClick = new EventEmitter<Resource>();

  getBaseClass() {
    if (this.disabled) {
      return "relative border-border bg-muted/40 opacity-50 cursor-not-allowed";
    }
    return "relative border-border bg-card hover:border-primary/30 hover:shadow-md";
  }

  getSelectedStyle() {
    if (this.selected) {
      return {
        boxShadow: `0 0 0 2px ${this.phaseColor}`,
        borderColor: `${this.phaseColor}50`,
        backgroundColor: `${this.phaseColor}08`,
      };
    }
    return {};
  }

  getInteractividadColor() {
    const inter = this.resource.interactividad || "";
    return INTERACTIVIDAD_COLOR[inter] || INTERACTIVIDAD_COLOR.Baja;
  }

  handleClick(_e: Event) {
    if (!this.disabled) {
      this.onClick.emit(this.resource);
    }
  }

  handleConfigClick(e: Event) {
    e.stopPropagation();
    this.onConfigClick.emit(this.resource);
  }
}
