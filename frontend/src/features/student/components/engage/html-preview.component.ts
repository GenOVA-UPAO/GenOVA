import { CommonModule } from "@angular/common";
import { Component, Input } from "@angular/core";
import { HtmlPreviewFrameComponent } from "../../../../core/components/html-preview-frame.component";
import type { PreviewResult } from "../../lib/types";

@Component({
  selector: "gn-html-preview",
  standalone: true,
  imports: [CommonModule, HtmlPreviewFrameComponent],
  template: `
    <div *ngIf="result" class="space-y-3">
      <div class="flex items-center justify-between flex-wrap gap-2">
        <div>
          <p class="text-sm font-semibold text-foreground">
            {{ result.emoji }} {{ result.tipo }} — 
            <span class="text-primary">{{ result.concepto }}</span>
          </p>
          <p class="text-xs text-muted-foreground">
            ⏱ {{ result.duracion }} · Interactividad: {{ result.interactividad }}
          </p>
        </div>
        <div class="flex items-center gap-2 flex-wrap">
          <div class="flex items-center gap-1">
            <button
              type="button"
              (click)="view = 'preview'"
              class="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 h-8 px-3"
              [ngClass]="view === 'preview' ? 'bg-primary text-primary-foreground shadow hover:bg-primary/90' : 'bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80'"
            >
              Vista previa
            </button>
            <button
              type="button"
              (click)="view = 'code'"
              class="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 h-8 px-3"
              [ngClass]="view === 'code' ? 'bg-primary text-primary-foreground shadow hover:bg-primary/90' : 'bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80'"
            >
              Código
            </button>
          </div>
          <button
            (click)="downloadHtml()"
            class="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-4 py-2"
          >
            Descargar HTML
          </button>
        </div>
      </div>

      <div class="rounded-xl border border-border overflow-hidden shadow-sm">
        <gn-html-preview-frame
          [html]="result.html_content || ''"
          [className]="'w-full h-[60vh] min-h-[240px] max-h-[640px] border-0 block' + (view === 'preview' ? '' : ' hidden')"
          height=""
        ></gn-html-preview-frame>
        <div [class.hidden]="view !== 'code'">
          <div class="flex items-center justify-between bg-slate-800 px-3 py-2">
            <span class="text-[10px] font-mono font-medium uppercase tracking-wider text-slate-400">
              HTML
            </span>
            <span class="text-[10px] text-slate-500">
              {{ (result.html_content?.length || 0) | number }} chars
            </span>
          </div>
          <pre class="max-h-[480px] overflow-auto bg-slate-900 p-4 text-[11px] leading-relaxed text-slate-200"><code>{{ result.html_content }}</code></pre>
        </div>
      </div>
    </div>
  `,
})
export class HtmlPreviewComponent {
  @Input() result?: PreviewResult;
  view: "preview" | "code" = "preview";

  downloadHtml() {
    if (!this.result?.html_content) return;
    const blob = new Blob([this.result.html_content], { type: "text/html" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `engage-${this.result.resource_type}-${this.result.concepto?.replace(/\s+/g, "_")}.html`;
    a.click();
  }
}
