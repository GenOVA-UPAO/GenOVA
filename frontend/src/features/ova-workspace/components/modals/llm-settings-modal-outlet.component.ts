import {
  ChangeDetectionStrategy,
  Component,
  type ComponentRef,
  effect,
  inject,
  input,
  type OnDestroy,
  output,
  type OutputRefSubscription,
  ViewContainerRef,
} from "@angular/core";

import {
  LLM_SETTINGS_MODAL,
  type LlmSettingsModalContract,
} from "@/core/lib/llm-settings-modal.token";

/**
 * Punto de montaje del modal de ajustes LLM. Carga la implementación real
 * (feature llm-settings) vía LLM_SETTINGS_MODAL la primera vez que se abre.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: "gn-llm-settings-modal-outlet",
  template: "",
})
export class LlmSettingsModalOutletComponent implements OnDestroy {
  readonly open = input(false);
  readonly onOpenChange = output<boolean>();

  private vcr = inject(ViewContainerRef);
  private loadModal = inject(LLM_SETTINGS_MODAL);
  private ref: ComponentRef<LlmSettingsModalContract> | null = null;
  private sub: OutputRefSubscription | null = null;
  private loading = false;

  constructor() {
    effect(() => {
      const open = this.open();
      if (open && !this.ref && !this.loading) {
        this.loading = true;
        void this.attach();
        return;
      }
      this.ref?.setInput("open", open);
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  private async attach(): Promise<void> {
    try {
      const type = await this.loadModal();
      this.ref = this.vcr.createComponent(type);
      this.sub = this.ref.instance.onOpenChange.subscribe((v) => {
        this.onOpenChange.emit(v);
      });
      this.ref.setInput("open", this.open());
    } catch {
      // Si el import() dinámico falla, cerrar el modal; sin este catch la
      // rejection dejaba `loading` en true y bloqueaba reabrirlo toda la sesión.
      this.onOpenChange.emit(false);
    } finally {
      this.loading = false;
    }
  }
}
