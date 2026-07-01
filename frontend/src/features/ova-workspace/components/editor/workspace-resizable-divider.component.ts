import { CommonModule } from "@angular/common";
import {
  Component,
  EventEmitter,
  HostListener,
  Input,
  type OnDestroy,
  type OnInit,
  Output,
} from "@angular/core";
import { clampRatio, SPLIT_MAX, SPLIT_MIN, saveSplitRatio } from "../../lib/workspace-utils";

@Component({
  selector: "gn-workspace-resizable-divider",
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="hidden sm:flex w-3 shrink-0 cursor-col-resize items-center justify-center group outline-none transition-colors hover:bg-primary/10 active:bg-primary/15 focus-visible:ring-2 focus-visible:ring-ring/50"
      (mousedown)="startDrag()"
      role="separator"
      aria-label="Ajustar paneles"
      aria-orientation="vertical"
      [attr.aria-valuenow]="ariaValueNow"
      [attr.aria-valuemin]="ariaValueMin"
      [attr.aria-valuemax]="ariaValueMax"
      tabindex="0"
      (keydown)="handleKeyDown($event)"
    >
      <div class="relative flex items-center justify-center">
        <div class="h-16 w-0.5 rounded-full bg-border group-hover:bg-primary/40 transition-colors"></div>
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 256 256" class="absolute rounded bg-background text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"><path d="M100,64a12,12,0,1,1-12-12A12,12,0,0,1,100,64Zm56-12a12,12,0,1,0,12,12A12,12,0,0,0,156,52ZM88,116a12,12,0,1,0,12,12A12,12,0,0,0,88,116Zm68,0a12,12,0,1,0,12,12A12,12,0,0,0,156,116ZM88,180a12,12,0,1,0,12,12A12,12,0,0,0,88,180Zm68,0a12,12,0,1,0,12,12A12,12,0,0,0,156,180Z"></path></svg>
      </div>
    </div>
  `,
})
export class WorkspaceResizableDividerComponent implements OnInit, OnDestroy {
  @Input() ratio = 0.38;
  @Input() containerRef!: HTMLElement | null;
  @Output() ratioChange = new EventEmitter<number>();

  dragging = false;
  private rafId = 0;
  private pendingX = 0;
  private lastRatio: number | null = null;

  get ariaValueNow() {
    return Math.round(this.ratio * 100);
  }
  get ariaValueMin() {
    return Math.round(SPLIT_MIN * 100);
  }
  get ariaValueMax() {
    return Math.round(SPLIT_MAX * 100);
  }

  nudge(delta: number) {
    const next = clampRatio(this.ratio + delta);
    this.ratioChange.emit(next);
    saveSplitRatio(next);
  }

  startDrag() {
    this.dragging = true;
    const gObj = window as unknown as Record<string, unknown>;
    const documentObj = gObj.document as Document;
    documentObj.body.style.userSelect = "none";
    documentObj.body.style.cursor = "col-resize";
  }

  handleKeyDown(e: KeyboardEvent) {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      this.nudge(-0.02);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      this.nudge(0.02);
    }
  }

  @HostListener("window:mousemove", ["$event"])
  onMove(e: MouseEvent) {
    if (!this.dragging) return;
    this.pendingX = e.clientX;
    if (!this.rafId) {
      const gObj = window as unknown as Record<string, unknown>;
      this.rafId = (gObj.requestAnimationFrame as (cb: () => void) => number)(() => this.flush());
    }
  }

  @HostListener("window:mouseup")
  onUp() {
    if (!this.dragging) return;
    this.dragging = false;
    const gObj = window as unknown as Record<string, unknown>;

    if (this.rafId) {
      (gObj.cancelAnimationFrame as (id: number) => void)(this.rafId);
      this.rafId = 0;
    }
    const documentObj = gObj.document as Document;
    documentObj.body.style.userSelect = "";
    documentObj.body.style.cursor = "";

    if (this.lastRatio !== null) saveSplitRatio(this.lastRatio);
  }

  private flush() {
    this.rafId = 0;
    if (!this.dragging || !this.containerRef) return;
    const rect = this.containerRef.getBoundingClientRect();
    this.lastRatio = clampRatio((this.pendingX - rect.left) / rect.width);
    this.ratioChange.emit(this.lastRatio);
  }

  ngOnInit() {}

  ngOnDestroy() {
    if (this.rafId) {
      const gObj = window as unknown as Record<string, unknown>;
      (gObj.cancelAnimationFrame as (id: number) => void)(this.rafId);
    }
  }
}
