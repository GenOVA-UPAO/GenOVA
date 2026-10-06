import { act, render, waitFor } from "@testing-library/react";
import i18n from "i18next";
import { createMemoryRouter, RouterProvider } from "react-router";
import { describe, expect, it } from "vitest";

import { RootLayout } from "./root-layout";

describe("título de página", () => {
  it("se traduce sin navegar cuando cambia el idioma", async () => {
    const router = createMemoryRouter([{
      Component: RootLayout,
      children: [{
        path: "/",
        handle: { get title() { return i18n.t("shell:mi_perfil"); } },
        element: <div />,
      }],
    }]);
    render(<RouterProvider router={router} />);
    await waitFor(() => { expect(document.title).toBe("Mi perfil · GenOVA"); });
    await act(() => i18n.changeLanguage("en"));
    expect(document.title).toBe("My profile · GenOVA");
    router.dispose();
  });
});
