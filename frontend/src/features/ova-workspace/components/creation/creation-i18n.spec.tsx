import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import i18n from "i18next";
import { describe, expect, it, vi } from "vitest";

import { CreationPromptField } from "./creation-prompt-field";
import { CreationSteps } from "./creation-steps";

describe("creación es/en", () => {
  it("cambia etiquetas y ejemplo sin sustituir la descripción del docente", async () => {
    const onPrompt = vi.fn();
    render(<><CreationPromptField prompt="Mi descripción original" onPrompt={onPrompt} showError={false} onBlur={vi.fn()} onSubmitShortcut={vi.fn()} /><CreationSteps describeDone resourcesDone generateReady /></>);
    await act(() => i18n.changeLanguage("en"));
    expect(screen.getByRole("textbox", { name: "Describe the OVA topic" })).toHaveValue("Mi descripción original");
    expect(screen.getByText("Choose resources")).toBeVisible();
    expect(onPrompt).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Use sample prompt" }));
    expect(onPrompt).toHaveBeenCalledWith(expect.stringMatching(/^Storage management in Oracle/));
  });
});
