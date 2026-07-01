import { CommonModule } from "@angular/common";
import { Component, EventEmitter, Input, Output } from "@angular/core";

export interface Palette {
  name: string;
  p: string;
  a: string;
}

@Component({
  selector: "gn-theme-radio-option",
  standalone: true,
  imports: [CommonModule],
  template: `
    <button
      type="button"
      (click)="onClick.emit()"
      [ngClass]="{
        'border-primary bg-primary/5': checked,
        'border-border hover:bg-accent': !checked
      }"
      class="flex items-start gap-2.5 w-full rounded-xl border p-2.5 text-left cursor-pointer transition"
    >
      <div
        [ngClass]="{
          'border-primary': checked,
          'border-muted-foreground/40': !checked
        }"
        class="mt-0.5 h-4 w-4 rounded-full border-2 shrink-0 flex items-center justify-center"
      >
        <div *ngIf="checked" class="h-2 w-2 rounded-full bg-primary"></div>
      </div>
      <div class="min-w-0">
        <p class="text-xs font-semibold text-foreground">{{ label }}</p>
        <p class="text-[10px] text-muted-foreground leading-snug mt-0.5">{{ desc }}</p>
      </div>
    </button>
  `,
})
export class ThemeRadioOptionComponent {
  @Input({ required: true }) label!: string;
  @Input({ required: true }) desc!: string;
  @Input() checked = false;
  @Output() onClick = new EventEmitter<void>();
}

@Component({
  selector: "gn-theme-mini-preview",
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="rounded-xl border border-border overflow-hidden shadow-md">
      <div [style.background]="primary" class="px-3 py-2.5">
        <div class="text-white font-bold text-[9px]">Fotosíntesis y el Ciclo</div>
        <div class="text-white/60 text-[7px] mt-0.5">Biología — 2° año · UPAO 2026</div>
      </div>
      <div *ngIf="isTabbed" class="flex bg-muted/30 border-b border-border">
        <div
          *ngFor="let t of tabs; let i = index"
          class="px-2 py-1.5 text-[7px] font-semibold shrink-0"
          [style.color]="i === 0 ? accent : '#94a3b8'"
          [style.borderBottom]="i === 0 ? '2px solid ' + accent : '2px solid transparent'"
        >
          {{ t }}
        </div>
      </div>
      <div class="p-2.5 space-y-2 bg-background">
        <div class="h-2 rounded-full w-3/5 opacity-25" [style.background]="primary"></div>
        <div class="h-1.5 rounded-full w-full bg-muted"></div>
        <div class="h-1.5 rounded-full w-5/6 bg-muted"></div>
        <div class="h-1.5 rounded-full w-4/6 bg-muted"></div>
        <div class="grid grid-cols-2 gap-1.5 pt-1">
          <div class="h-8 rounded-lg opacity-20" [style.background]="accent"></div>
          <div class="h-8 rounded-lg bg-muted/50"></div>
        </div>
        <div class="flex items-center gap-1.5">
          <div class="h-2 flex-1 rounded-full" [style.background]="accent" [style.opacity]="0.4"></div>
          <div class="h-2 w-8 rounded-full bg-muted"></div>
        </div>
      </div>
      <div [style.background]="primary" [style.opacity]="0.06" class="h-1"></div>
    </div>
  `,
})
export class ThemeMiniPreviewComponent {
  @Input({ required: true }) colorMode!: string;
  @Input({ required: true }) designMode!: string;
  @Input() palette: Palette | null = null;

  tabs = ["Engage", "Explore", "Explain", "Evaluate"];

  get primary(): string {
    if (this.colorMode === "upao") return "#0A3D91";
    if (this.colorMode === "custom") return this.palette?.p ?? "#0A3D91";
    return "#6D28D9";
  }

  get accent(): string {
    if (this.colorMode === "upao") return "#F47A20";
    if (this.colorMode === "custom") return this.palette?.a ?? "#38BDF8";
    return "#A78BFA";
  }

  get isTabbed(): boolean {
    return this.designMode !== "ai";
  }
}
