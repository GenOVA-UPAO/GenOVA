import { ChangeDetectionStrategy, Component } from "@angular/core";
import { RouterOutlet } from "@angular/router";
import { HlmToaster } from "@spartan-ng/helm/sonner";

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: "gn-root",
  imports: [RouterOutlet, HlmToaster],
  template: `
    <router-outlet />
    <hlm-toaster />
  `,
  styles: [],
})
export class AppComponent {}
