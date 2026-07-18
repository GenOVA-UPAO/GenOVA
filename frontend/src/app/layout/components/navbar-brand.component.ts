import { ChangeDetectionStrategy, Component } from "@angular/core";
import { RouterLink } from "@angular/router";
import { hlmLarge } from "@spartan-ng/helm/typography";

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: "gn-navbar-brand",
  imports: [RouterLink],
  template: `
    <a
      routerLink="/dashboard"
      aria-label="GenOVA"
      class="${hlmLarge} font-display tracking-tight text-foreground"
    >
      Gen<span class="text-primary">OVA</span>
    </a>
  `,
})
export class NavbarBrandComponent {}
