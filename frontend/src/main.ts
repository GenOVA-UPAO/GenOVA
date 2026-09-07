import { bootstrapApplication } from "@angular/platform-browser";

import { AppComponent } from "./app/app";
import { appConfig } from "./app/app.config";
import { initSentry } from "./core/lib/observability/sentry";

// Sentry se inicializa EN PARALELO al bootstrap, no antes: encadenarlo con
// `.then(bootstrap)` metía la descarga+parseo del SDK (~129 KB de transferencia)
// en la ruta crítica del primer render cuando hay DSN, retrasando FCP/LCP.
// Sin DSN `initSentry()` resuelve al instante, así que esto es no-op en dev/CI.
void initSentry();
bootstrapApplication(AppComponent, appConfig).catch((err: unknown) => {
  console.error(err);
});
