import { bootstrapApplication } from "@angular/platform-browser";

import { AppComponent } from "./app/app";
import { appConfig } from "./app/app.config";
import { initSentry } from "./core/lib/observability/sentry";

initSentry()
  .then(() => bootstrapApplication(AppComponent, appConfig))
  .catch((err: unknown) => {
    console.error(err);
  });
