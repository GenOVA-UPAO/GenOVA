import {
  ChangeDetectionStrategy,
  Component,
  type ElementRef,
  Input,
  input,
  output,
  viewChild,
} from "@angular/core";

import { ButtonComponent } from "@/core/components/ui/button.component";

import type { OvaTheme } from "../../lib/types";
import type { UploadsProps } from "../../lib/uploadTypes";
import { OvaFilesModalComponent } from "../modals/ova-files-modal.component";
import { OvaThemeModalComponent } from "../modals/ova-theme-modal.component";
import { FileChipComponent } from "../shared/file-chip.component";

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: "gn-ova-create-form-card",
  imports: [ButtonComponent, FileChipComponent, OvaFilesModalComponent, OvaThemeModalComponent],
  templateUrl: "./ova-create-form-card.component.html",
})
export class OvaCreateFormCardComponent {
  readonly fileInputRef = viewChild.required<ElementRef<HTMLInputElement>>("fileInput");

  readonly prompt = input("");
  readonly minChars = input(10);
  readonly canGenerate = input(false);
  @Input() totalResources = 0;
  readonly selections = input<Record<string, unknown[]>>({});
  readonly theme = input<OvaTheme>({ color: "upao", design: "upao" });
  @Input() error = "";
  @Input() uploadsProps!: UploadsProps;

  readonly promptChange = output<string>();
  readonly openModal = output();
  readonly generate = output();
  readonly themeChange = output<OvaTheme>();

  showFiles = false;
  showTheme = false;

  get themeLabel() {
    const color = this.theme().color === "free" ? "Libre" : "UPAO";
    const design = this.theme().design === "free" ? "Libre" : "UPAO";
    return `Color: ${color} · Diseño: ${design}`;
  }

  get resourceSummary() {
    if (this.totalResources <= 0) return null;
    return Object.entries(this.selections())
      .filter(([, v]) => v.length > 0)
      .map(([k, v]) => `${k} (${v.length})`)
      .join(" · ");
  }

  handleKeydown(e: KeyboardEvent) {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey) && this.canGenerate()) this.generate.emit();
  }

  handleDrop(e: DragEvent) {
    e.preventDefault();
    if (e.dataTransfer?.files?.length) this.uploadsProps.onFilesSelected(e.dataTransfer.files);
  }

  handleFileChange(e: Event) {
    const input = e.target as HTMLInputElement;
    if (input.files) this.uploadsProps.onFilesSelected(input.files);
    input.value = "";
  }
}
