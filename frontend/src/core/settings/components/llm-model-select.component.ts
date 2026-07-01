import { CommonModule } from "@angular/common";
import { Component, EventEmitter, Input, Output } from "@angular/core";

@Component({
  selector: "gn-llm-model-select",
  standalone: true,
  imports: [CommonModule],
  template: `
    <select
      [attr.aria-label]="ariaLabel"
      [value]="currentValue"
      [disabled]="disabled"
      (change)="handleChange($event)"
      class="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
    >
      <option value="">— elegir modelo —</option>
      <option
        *ngFor="let m of models"
        [value]="m.provider + '::' + m.model_id"
      >
        {{ (m.label || m.model_id) + ' · ' + m.provider }}
      </option>
    </select>
  `,
})
export class LlmModelSelectComponent {
  @Input({ required: true }) models!: Array<{
    provider: string;
    model_id: string;
    label?: string;
    context_length?: number;
    pricing?: string;
  }>;
  @Input() provider?: string;
  @Input() modelId?: string;
  @Input() disabled = false;
  @Input() ariaLabel = "";

  @Output() onChange = new EventEmitter<{ provider: string; modelId: string }>();

  get currentValue(): string {
    return this.provider && this.modelId ? `${this.provider}::${this.modelId}` : "";
  }

  handleChange(e: Event) {
    const select = e.target as HTMLSelectElement;
    const [p, m] = select.value.split("::");
    this.onChange.emit({ provider: p || "", modelId: m || "" });
  }
}
