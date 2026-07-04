import { provideHttpClient } from "@angular/common/http";
import { provideZonelessChangeDetection } from "@angular/core";
import { provideRouter, withDisabledInitialNavigation } from "@angular/router";
import { provideTanStackQuery, QueryClient } from "@tanstack/angular-query-experimental";
import { applicationConfig, type Preview } from "@storybook/angular";
import { setCompodocJson } from "@storybook/addon-docs/angular";
import { withThemeByClassName } from "@storybook/addon-themes";
import { initialize, mswLoader } from "msw-storybook-addon";

import docJson from "../documentation.json";

setCompodocJson(docJson);

// Warn (don't fail) on unmocked API calls — most stories won't define MSW
// handlers; this just surfaces it in the console instead of crashing.
initialize({ onUnhandledRequest: "warn" });

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
  loaders: [mswLoader],
  decorators: [
    // Matches src/styles.css's Tailwind `.dark` class convention.
    withThemeByClassName({
      themes: { light: "", dark: "dark" },
      defaultTheme: "light",
    }),
    // Global DI so components that inject Router/HttpClient/TanStack Query
    // (i.e. most page + smart components, not just presentational ones)
    // don't crash just from being instantiated. Empty routes + disabled
    // initial navigation on purpose: with real routes the Router still
    // tries to match Storybook's own iframe.html URL on bootstrap and
    // throws NG04002 ("Cannot match any routes"). Stories aren't meant to
    // navigate, just to satisfy DI; a story that needs a real route/param
    // can override via its own `applicationConfig` decorator.
    applicationConfig({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([], withDisabledInitialNavigation()),
        provideHttpClient(),
        provideTanStackQuery(
          new QueryClient({
            defaultOptions: { queries: { staleTime: 30_000, retry: false } },
          }),
        ),
      ],
    }),
  ],
};

export default preview;
