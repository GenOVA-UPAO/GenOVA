import { Component, EventEmitter, Input, Output } from "@angular/core";
import type { Meta, StoryObj } from "@storybook/angular";
import { applicationConfig } from "@storybook/angular";

import { LLM_SETTINGS_MODAL } from "@/core/lib/llm-settings-modal.token";

import { LlmSettingsModalOutletComponent } from "./llm-settings-modal-outlet.component";

/**
 * Minimal stand-in for the real llm-settings feature modal, loaded lazily by
 * LlmSettingsModalOutletComponent via the LLM_SETTINGS_MODAL token. Keeps this
 * story out of the real feature bundle, matching how app.config.ts wires the
 * real one via a dynamic import.
 */
@Component({
  selector: "gn-fake-llm-settings-modal",
  template: `
    @if (open) {
      <div
        class="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 backdrop-blur-sm"
      >
        <div class="rounded-2xl border border-border bg-card p-6 shadow-2xl">
          <p class="text-sm font-semibold">Ajustes LLM (stub de Storybook)</p>
          <p class="mt-1 text-xs text-muted-foreground">
            La implementación real vive en la feature llm-settings.
          </p>
        </div>
      </div>
    }
  `,
})
class FakeLlmSettingsModalComponent {
  @Input() open = false;
  @Output() onOpenChange = new EventEmitter<boolean>();
}

const meta: Meta<LlmSettingsModalOutletComponent> = {
  component: LlmSettingsModalOutletComponent,
  title: "Features/OvaWorkspace/Modals/LlmSettingsModalOutlet",
  tags: ["autodocs"],
  decorators: [
    applicationConfig({
      providers: [
        {
          provide: LLM_SETTINGS_MODAL,
          useValue: () => Promise.resolve(FakeLlmSettingsModalComponent),
        },
      ],
    }),
  ],
  args: {
    open: true,
  },
};
export default meta;

type Story = StoryObj<LlmSettingsModalOutletComponent>;

/**
 * With `open: true`, the outlet's effect lazily attaches the (stubbed) modal
 * component the first time it renders.
 */
export const Default: Story = {};

export const Closed: Story = {
  args: {
    open: false,
  },
};
