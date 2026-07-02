import { provideHttpClient, withFetch } from "@angular/common/http";
import {
  type ApplicationConfig,
  ErrorHandler,
  provideBrowserGlobalErrorListeners,
} from "@angular/core";
import { provideAnimationsAsync } from "@angular/platform-browser/animations/async";
import {
  PreloadAllModules,
  provideRouter,
  withComponentInputBinding,
  withPreloading,
  withViewTransitions,
} from "@angular/router";
import Aura from "@primeuix/themes/aura";
import { definePreset } from "@primeuix/themes";
import { providePrimeNG } from "primeng/config";

/**
 * Aura ships an emerald `primary` palette. Override it with the UPAO blue ramp
 * (#0A3D91 as the base 500) so PrimeNG components — p-button-primary, etc. —
 * match the Editorial Académico UPAO chrome instead of rendering green.
 */
const GenovaPreset = definePreset(Aura, {
  semantic: {
    primary: {
      50: "#e8eefb",
      100: "#c6d5f4",
      200: "#93aee8",
      300: "#5f86db",
      400: "#2f60cc",
      500: "#0a3d91",
      600: "#093581",
      700: "#082c6b",
      800: "#062250",
      900: "#041637",
      950: "#020b1c",
    },
  },
});

import { captureException, isSentryEnabled } from "../core/lib/observability/sentry";
import { LLM_SETTINGS_MODAL } from "../core/lib/llm-settings-modal.token";
import { routes } from "./app.routes";

/**
 * Reports uncaught errors to Sentry via the lazy `captureException` helper.
 * Do NOT import from "@sentry/angular" statically here — that would pull the
 * whole SDK into the initial bundle (it blew the 1.1MB budget).
 */
class SentryErrorHandler implements ErrorHandler {
  handleError(error: unknown): void {
    captureException(error);
    console.error(error);
  }
}

const sentryProviders = isSentryEnabled()
  ? [{ provide: ErrorHandler, useClass: SentryErrorHandler }]
  : [];

export const appConfig: ApplicationConfig = {
  providers: [
    ...sentryProviders,
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      routes,
      withComponentInputBinding(),
      withViewTransitions(),
      // Preload all lazy routes during idle time → near-instant page-to-page
      // navigation after first paint (chunks are already in cache).
      withPreloading(PreloadAllModules),
    ),
    // Angular HttpClient (used by Sentry and Angular-specific integrations).
    // Our own API calls go through core/lib/http.ts (fetch-based).
    provideHttpClient(withFetch()),
    provideAnimationsAsync(),
    // Composición app→features: ova-workspace consume el modal de ajustes LLM
    // vía token de core; la implementación vive en la feature llm-settings.
    {
      provide: LLM_SETTINGS_MODAL,
      useValue: () =>
        import("../features/llm-settings/components/llm-settings-modal.component").then(
          (m) => m.LlmSettingsModalComponent,
        ),
    },
    providePrimeNG({
      theme: {
        preset: GenovaPreset,
        options: {
          darkModeSelector: ".dark",
        },
      },
    }),
  ],
};
