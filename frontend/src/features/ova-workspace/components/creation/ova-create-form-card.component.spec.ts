import { Component, input, inputBinding, output, outputBinding } from "@angular/core";
import { render, screen } from "@testing-library/angular/zoneless";

import type { UploadsProps } from "../../lib/uploadTypes";
import { OvaFilesModalComponent } from "../modals/ova-files-modal.component";
import { OvaThemeModalComponent } from "../modals/ova-theme-modal.component";
import { FileChipComponent } from "../shared/file-chip.component";
import { EXAMPLE_PROMPT, OvaCreateFormCardComponent } from "./ova-create-form-card.component";

@Component({ selector: "gn-ova-files-modal", template: "" })
class StubFilesModal {
  readonly open = input(false);
  readonly uploads = input<unknown[]>([]);
  readonly activeUploadsCount = input(0);
  readonly maxUploadFiles = input(5);
  readonly onFilesSelected = output<FileList | File[]>();
  readonly onRemove = output<string>();
  readonly onOpenChange = output<boolean>();
}

@Component({ selector: "gn-ova-theme-modal", template: "" })
class StubThemeModal {
  readonly open = input(false);
  readonly theme = input<{ color: string; design: string }>({ color: "upao", design: "upao" });
  readonly themeChange = output<unknown>();
  readonly onClose = output();
}

@Component({ selector: "gn-file-chip", template: "" })
class StubFileChip {
  readonly file = input<unknown>(null);
  readonly onRemove = output<string>();
}

const emptyUploads: UploadsProps = {
  uploads: [],
  activeUploadsCount: 0,
  maxUploadFiles: 5,
  uploadError: "",
  onFilesSelected: () => undefined,
  onRemove: () => undefined,
};

const importOverrides = [
  { replace: OvaFilesModalComponent, with: StubFilesModal },
  { replace: OvaThemeModalComponent, with: StubThemeModal },
  { replace: FileChipComponent, with: StubFileChip },
];

async function renderForm(
  opts: {
    prompt?: string;
    minChars?: number;
    canGenerate?: boolean;
    phasesWithResources?: number;
    error?: string;
    uploadsProps?: UploadsProps;
    onPromptChange?: (v: string) => void;
    onReplayTour?: () => void;
  } = {},
) {
  const prompt = opts.prompt ?? "";
  const minChars = opts.minChars ?? 10;
  const canGenerate = opts.canGenerate ?? false;
  const phasesWithResources = opts.phasesWithResources ?? 0;
  const error = opts.error ?? "";
  const uploadsProps = opts.uploadsProps ?? emptyUploads;
  const onPromptChange = opts.onPromptChange ?? (() => undefined);
  const onReplayTour = opts.onReplayTour ?? (() => undefined);

  return render(OvaCreateFormCardComponent, {
    importOverrides,
    bindings: [
      inputBinding("prompt", () => prompt),
      inputBinding("minChars", () => minChars),
      inputBinding("canGenerate", () => canGenerate),
      inputBinding("totalResources", () => 0),
      inputBinding("phasesWithResources", () => phasesWithResources),
      inputBinding("selections", () => ({})),
      inputBinding("theme", () => ({ color: "upao", design: "upao" })),
      inputBinding("error", () => error),
      inputBinding("uploadsProps", () => uploadsProps),
      outputBinding("promptChange", onPromptChange),
      outputBinding("replayTour", onReplayTour),
    ],
  });
}

describe("OvaCreateFormCardComponent", () => {
  it("EXAMPLE_PROMPT includes tema, objetivos and nivel educativo", () => {
    expect(EXAMPLE_PROMPT).toMatch(/Tema:/i);
    expect(EXAMPLE_PROMPT).toMatch(/Objetivos:/i);
    expect(EXAMPLE_PROMPT).toMatch(/Nivel educativo:/i);
  });

  it("CA-11 / CA-25 shows the three-step guide without optional resources", async () => {
    await renderForm();
    expect(screen.getByLabelText("Pasos para crear un OVA")).toBeTruthy();
    expect(screen.getByText("1. Describe")).toBeTruthy();
    expect(screen.getByText("2. Elige recursos")).toBeTruthy();
    expect(screen.queryByText(/Configura \(opcional\)/)).toBeNull();
    expect(screen.getByText("3. Genera")).toBeTruthy();
  });

  it("CA-24 help button emits replayTour", async () => {
    const replayed: boolean[] = [];
    await renderForm({ onReplayTour: () => replayed.push(true) });

    screen.getByRole("button", { name: "Ver tutorial" }).click();
    expect(replayed).toEqual([true]);
  });

  it("CA-12 useExample emits EXAMPLE_PROMPT", async () => {
    const emitted: string[] = [];
    await renderForm({ onPromptChange: (v) => emitted.push(v) });

    screen.getByRole("button", { name: "Usar ejemplo de prompt" }).click();
    expect(emitted).toEqual([EXAMPLE_PROMPT]);
  });

  it("CA-13 toolbar buttons expose aria-labels and sm+ text classes", async () => {
    const { container } = await renderForm();

    expect(screen.getByRole("button", { name: "Configurar recursos 5E" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Archivos de referencia" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Tema visual" })).toBeTruthy();

    const labels = Array.from(container.querySelectorAll('span[class*="sm:inline"]')).map((el) =>
      el.textContent?.trim(),
    );
    expect(labels).toEqual(expect.arrayContaining(["Recursos", "Archivos", "Tema"]));
  });

  it("CA-15 shows missing-characters message and keeps Generar disabled", async () => {
    await renderForm({ prompt: "corto", minChars: 10, canGenerate: false });

    expect(screen.getByText(/Faltan 5 caracteres para generar/)).toBeTruthy();
    const generate = screen.getByRole<HTMLButtonElement>("button", { name: "Generar OVA" });
    expect(generate.disabled).toBe(true);
  });

  it("CA-27 shows missing-phases message when prompt is valid but phases < 2", async () => {
    await renderForm({
      prompt: "prompt suficientemente largo",
      minChars: 10,
      phasesWithResources: 1,
      canGenerate: false,
    });

    expect(screen.getByText(/Selecciona recursos en al menos 2 fases \(falta 1\)/)).toBeTruthy();
    const generate = screen.getByRole<HTMLButtonElement>("button", { name: "Generar OVA" });
    expect(generate.disabled).toBe(true);
  });

  it("CA-16 associates label with the prompt textarea", async () => {
    await renderForm();
    const textarea = screen.getByLabelText("Describe el tema del OVA");
    expect(textarea.id).toBe("ova-create-prompt");
    expect(textarea.tagName).toBe("TEXTAREA");
  });

  it("CA-17 prompt has visible focus-visible ring (not ring-0 alone)", async () => {
    await renderForm();
    const textarea = screen.getByLabelText("Describe el tema del OVA");
    const cls = textarea.className;
    expect(cls).toContain("focus-visible:ring-2");
    expect(cls).toContain("focus-visible:ring-ring");
    expect(cls.includes("focus-visible:ring-0")).toBe(false);
  });

  it("CA-18 announces errors with role=alert and aria-live=polite", async () => {
    await renderForm({ error: "El prompt es obligatorio" });
    const alert = screen.getByRole("alert");
    expect(alert.getAttribute("aria-live")).toBe("polite");
    expect(alert.textContent).toContain("El prompt es obligatorio");
  });

  it("CA-19 shows mobile and desktop generate hints with correct visibility classes", async () => {
    const { container } = await renderForm();
    const mobile = Array.from(container.querySelectorAll("p")).find((p) =>
      p.textContent?.includes("Pulsa Generar"),
    );
    const desktop = Array.from(container.querySelectorAll("p")).find((p) =>
      p.textContent?.includes("Ctrl+Enter"),
    );
    expect(mobile?.className).toContain("sm:hidden");
    expect(desktop?.className).toContain("hidden");
    expect(desktop?.className).toContain("sm:block");
  });
});
