import type { Preview } from "@storybook/angular";
import { setCompodocJson } from "@storybook/addon-docs/angular";
import { withThemeByClassName } from "@storybook/addon-themes";
import { initialize, mswLoader } from "msw-storybook-addon";

import docJson from "../documentation.json";

setCompodocJson(docJson);

// Warn (don't fail) on unmocked API calls — most of today's stories are
// presentational and never fetch; this only matters once components that
// call http.ts get stories.
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
  ],
};

export default preview;
