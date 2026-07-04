import { CommonModule } from "@angular/common";
import { ChangeDetectionStrategy, Component, input, output } from "@angular/core";

import { ButtonComponent } from "@/core/components/ui/button.component";
import { ModalDismissDirective } from "@/core/directives/modal-dismiss.directive";

import { type ProviderOption, PROVIDERS } from "./connect-provider-modal.helpers";

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: "gn-connect-provider-modal",
  imports: [CommonModule, ButtonComponent, ModalDismissDirective],
  templateUrl: "./connect-provider-modal.component.html",
})
export class ConnectProviderModalComponent {
  readonly open = input(false);
  readonly onClose = output();
  readonly onSelectProvider = output<string>();

  providers: ProviderOption[] = PROVIDERS;

  select(id: string): void {
    this.onSelectProvider.emit(id);
  }

  dismissModal = (): void => {
    this.onClose.emit();
  };
}
