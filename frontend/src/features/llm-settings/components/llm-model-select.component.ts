import { ChangeDetectionStrategy, Component, computed, input, output } from "@angular/core";

interface SelectModel {
  provider: string;
  model_id: string;
  label?: string;
  context_length?: number;
  pricing?: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: "gn-llm-model-select",
  imports: [],
  template: `
    <select
      [attr.aria-label]="ariaLabel()"
      [disabled]="disabled()"
      (change)="handleChange($event)"
      class="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
    >
      <option value="" [selected]="!currentValue()">— elegir modelo —</option>
      @for (m of displayModels(); track trackKey(m)) {
        <option [value]="trackKey(m)" [selected]="trackKey(m) === currentValue()">
          {{ (m.label || m.model_id) + " · " + m.provider }}
        </option>
      }
    </select>
  `,
})
export class LlmModelSelectComponent {
  readonly models = input.required<SelectModel[]>();
  readonly provider = input<string | undefined>(undefined);
  readonly modelId = input<string | undefined>(undefined);
  readonly disabled = input(false);
  readonly ariaLabel = input("");

  readonly onChange = output<{
    provider: string;
    modelId: string;
  }>();

  readonly currentValue = computed(() => {
    const provider = this.provider();
    const modelId = this.modelId();
    return provider && modelId ? `${provider}::${modelId}` : "";
  });

  /** Includes a stub row when the bound value is missing from the pool. */
  readonly displayModels = computed(() => {
    const list = this.models();
    const provider = this.provider();
    const modelId = this.modelId();
    if (!provider || !modelId) return list;
    if (list.some((m) => m.provider === provider && m.model_id === modelId)) return list;
    return [{ provider, model_id: modelId, label: modelId }, ...list];
  });

  trackKey(m: SelectModel): string {
    return `${m.provider}::${m.model_id}`;
  }

  handleChange(e: Event) {
    const select = e.target as HTMLSelectElement;
    const [p, m] = select.value.split("::");
    this.onChange.emit({ provider: p || "", modelId: m || "" });
  }
}
