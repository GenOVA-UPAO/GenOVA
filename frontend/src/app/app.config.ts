import { provideHttpClient } from "@angular/common/http";
import {
  type ApplicationConfig,
  ErrorHandler,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from "@angular/core";
import {
  PreloadAllModules,
  provideRouter,
  withComponentInputBinding,
  withPreloading,
  withViewTransitions,
} from "@angular/router";
import { provideTanStackQuery, QueryClient } from "@tanstack/angular-query-experimental";

import { LLM_SETTINGS_MODAL } from "../core/lib/llm-settings-modal.token";
import { captureException, isSentryEnabled } from "../core/lib/observability/sentry";
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
    // Explicit zoneless CD — zone.js was never a dep; this makes the implicit
    // behavior an intentional, documented API contract.
    provideZonelessChangeDetection(),
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
    provideHttpClient(),
    // TanStack Query — server-state cache/dedup/retry for the fetch-based API layer.
    // Tuned defaults; individual queries override as needed.
    provideTanStackQuery(
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      }),
    ),
    // Composición app→features: ova-workspace consume el modal de ajustes LLM
    // vía token de core; la implementación vive en la feature llm-settings.
    {
      provide: LLM_SETTINGS_MODAL,
      useValue: () =>
        import("../features/llm-settings/components/llm-settings-modal.component").then(
          (m) => m.LlmSettingsModalComponent,
        ),
    },
  ],
};
