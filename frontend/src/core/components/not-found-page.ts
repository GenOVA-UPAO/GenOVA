import { Component } from "@angular/core";
import { RouterLink } from "@angular/router";

@Component({
  selector: "gn-not-found-page",
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center p-4 text-center">
      <h1 class="mb-4 text-6xl font-extrabold tracking-tight text-primary">404</h1>
      <h2 class="mb-2 text-2xl font-semibold tracking-tight">Página no encontrada</h2>
      <p class="mb-8 text-muted-foreground">Lo sentimos, no pudimos encontrar la página que estás buscando.</p>
      <a routerLink="/" class="inline-flex h-10 items-center justify-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground ring-offset-background transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50">
        Volver al inicio
      </a>
    </div>
  `,
})
export class NotFoundPage {}
