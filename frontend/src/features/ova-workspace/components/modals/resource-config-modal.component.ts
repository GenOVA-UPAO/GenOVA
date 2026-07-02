import { Component, type OnInit, input, output } from "@angular/core";
import { DialogModule } from "primeng/dialog";
import { ButtonComponent } from "@/core/components/ui/button.component";
import { getSchema } from "../../lib/resource-config";
import type { ConfigField } from "../../lib/resource-config";
import type { Resource } from "@/core/lib/ova-types";

@Component({
  selector: "gn-resource-config-modal",
  standalone: true,
  imports: [DialogModule, ButtonComponent],
  templateUrl: "./resource-config-modal.component.html",
})
export class ResourceConfigModalComponent implements OnInit {
  readonly resource = input.required<Resource>();
  readonly phaseKey = input.required<string>();
  readonly phaseColor = input.required<string>();
  readonly config = input<Record<string, number>>({});
  readonly videoKeyConfigured = input(true);
  readonly visible = input(true);

  readonly onClose = output<void>();
  readonly onSave = output<{
    phaseKey: string;
    resource: Resource;
    config: Record<string, number>;
  }>();

  schema: ConfigField[] = [];
  values: Record<string, number> = {};

  ngOnInit(): void {
    this.schema = getSchema(this.phaseKey(), String(this.resource().id));
    const init: Record<string, number> = {};
    for (const f of this.schema) {
      init[f.key] = this.config()?.[f.key] ?? f.default;
    }
    this.values = init;
  }

  setField(fieldKey: string, val: number): void {
    this.values = { ...this.values, [fieldKey]: val };
  }

  isDisabled(field: ConfigField): boolean {
    return Boolean(field.requiresVideo && !this.videoKeyConfigured());
  }

  apply(): void {
    this.onSave.emit({
      phaseKey: this.phaseKey(),
      resource: this.resource(),
      config: { ...this.values },
    });
    this.onClose.emit();
  }
}
