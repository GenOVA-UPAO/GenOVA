import { CommonModule } from "@angular/common";
import { Component, input, output } from "@angular/core";
import { ButtonComponent } from "@/core/components/ui/button.component";
import { ModalDismissDirective } from "@/core/directives/modal-dismiss.directive";
import { PROVIDERS, type ProviderOption } from "./connect-provider-modal.helpers";

@Component({
  selector: "gn-connect-provider-modal",
  standalone: true,
  imports: [CommonModule, ButtonComponent, ModalDismissDirective],
  templateUrl: "./connect-provider-modal.component.html",
})
export class ConnectProviderModalComponent {
  readonly open = input(false);
  readonly onClose = output<void>();
  readonly onSelectProvider = output<string>();

  providers: ProviderOption[] = PROVIDERS;

  select(id: string): void {
    this.onSelectProvider.emit(id);
  }

  dismissModal = (): void => {
    this.onClose.emit();
  };
}
