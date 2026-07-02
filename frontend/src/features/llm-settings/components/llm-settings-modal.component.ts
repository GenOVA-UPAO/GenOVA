import {
  Component,
  inject,
  type OnChanges,
  type SimpleChanges,
  input,
  output,
} from "@angular/core";
import { RouterLink } from "@angular/router";
import { ButtonComponent } from "@/core/components/ui/button.component";
import {
  DialogComponent,
  DialogContentComponent,
  DialogDescriptionComponent,
  DialogFooterComponent,
  DialogHeaderComponent,
  DialogTitleComponent,
} from "@/core/components/ui/dialog.component";
import { LlmSettingsFormComponent } from "./llm-settings-form.component";
import { UserLlmSettingsStore } from "../services/user-llm-settings.store";

@Component({
  selector: "gn-llm-settings-modal",
  standalone: true,
  imports: [
    RouterLink,
    DialogComponent,
    DialogContentComponent,
    DialogHeaderComponent,
    DialogFooterComponent,
    DialogTitleComponent,
    DialogDescriptionComponent,
    ButtonComponent,
    LlmSettingsFormComponent,
  ],
  templateUrl: "./llm-settings-modal.component.html",
})
export class LlmSettingsModalComponent implements OnChanges {
  readonly open = input(false);
  readonly onOpenChange = output<boolean>();

  store = inject(UserLlmSettingsStore);

  ngOnChanges(changes: SimpleChanges): void {
    if (changes["open"]?.currentValue === true) {
      void this.store.load({ search: "", category: "all", page: 1 });
    }
  }

  close(): void {
    this.onOpenChange.emit(false);
  }

  async handleSave(): Promise<void> {
    const ok = await this.store.save();
    if (ok) this.close();
  }
}
