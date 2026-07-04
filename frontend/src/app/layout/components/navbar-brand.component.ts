import { ChangeDetectionStrategy, Component } from "@angular/core";
import { RouterLink } from "@angular/router";

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: "gn-navbar-brand",
  imports: [RouterLink],
  template: `
    <a
      routerLink="/dashboard"
      class="font-display text-xl font-semibold tracking-tight text-foreground"
    >
      Gen<span class="text-primary">OVA</span>
      <span
        class="ml-1.5 align-middle text-[10px] font-sans font-semibold uppercase tracking-[0.18em] text-accent-brand"
      >
        ML
      </span>
    </a>
  `,
})
export class NavbarBrandComponent {}
