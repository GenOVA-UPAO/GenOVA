import { ChangeDetectionStrategy, Component, input, output } from "@angular/core";

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: "gn-llm-model-select",
  imports: [],
  template: `
    <select
      [attr.aria-label]="ariaLabel()"
      [value]="currentValue"
      [disabled]="disabled()"
      (change)="handleChange($event)"
      class="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
    >
      <option value="">— elegir modelo —</option>
      @for (m of models(); track m) {
        <option [value]="m.provider + '::' + m.model_id">
          {{ (m.label || m.model_id) + " · " + m.provider }}
        </option>
      }
    </select>
  `,
})
export class LlmModelSelectComponent {
  readonly models = input.required<
    {
      provider: string;
      model_id: string;
      label?: string;
      context_length?: number;
      pricing?: string;
    }[]
  >();
  readonly provider = input<string | undefined>(undefined);
  readonly modelId = input<string | undefined>(undefined);
  readonly disabled = input(false);
  readonly ariaLabel = input("");

  readonly onChange = output<{
    provider: string;
    modelId: string;
  }>();

  get currentValue(): string {
    const provider = this.provider();
    const modelId = this.modelId();
    return provider && modelId ? `${provider}::${modelId}` : "";
  }

  handleChange(e: Event) {
    const select = e.target as HTMLSelectElement;
    const [p, m] = select.value.split("::");
    this.onChange.emit({ provider: p || "", modelId: m || "" });
  }
}
