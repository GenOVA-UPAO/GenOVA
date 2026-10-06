import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import i18n from "i18next";
import { describe, expect, it, vi } from "vitest";

import { CreationLevelSelect } from "./creation/creation-level-select";
import { CreationSubmitBar } from "./creation/creation-submit-bar";
import { ProgressPanel } from "./creation/progress-panel";
import { ChatComposer } from "./editor/chat-composer";
import { ChatProgressBar } from "./editor/chat-progress-bar";
import { ChatScopeToggle } from "./editor/chat-scope-toggle";
import { ResourceFeedbackForm } from "./editor/resource-feedback-form";
import { WorkspaceOvaPanelTabs } from "./editor/workspace-ova-panel-tabs";
import { WorkspacePhaseCodeEditor } from "./editor/workspace-phase-code-editor";
import { OvaThemeSelector } from "./modals/ova-theme-selector";
import { PhaseSelectFooter } from "./modals/phase-select-footer";
import { PhaseSelectTabs } from "./modals/phase-select-tabs";
import ResourceConfigModal from "./modals/resource-config-modal";
import { ResourcePreviewPanel } from "./modals/resource-preview-panel";
import { HtmlCodeView } from "./phase/html-code-view";
import { FileChip } from "./shared/file-chip";
import { BlockList } from "./visual-editor/block-list";
import { IntentPreviewCard } from "./visual-editor/intent-preview-card";
import { InteractiveReveal } from "./visual-editor/interactive-reveal";
import { VisualPromptControls } from "./visual-editor/visual-prompt-controls";
import { VisualSpecRenderer } from "./visual-editor/visual-spec-renderer";

const english = () => act(() => i18n.changeLanguage("en"));
const spanish = () => act(() => i18n.changeLanguage("es"));

describe("workspace montado cambia de idioma", () => {
  it("traduce bloques, acciones y etiquetas del renderizador visual preservando contenido", async () => {
    render(<>
      <BlockList blocks={[{ id: "block", tipo: "example", props: { content: "Mi ejemplo original" } }]} />
      <IntentPreviewCard intent={{ accion: "mover", bloque: { tipo: "example", indice: "ultimo" }, destino: { posicion: "inicio" }, confianza: 0.9 }} trace={null} canUndo={false} onUndo={vi.fn()} />
      <VisualSpecRenderer spec={{ root: "summary", elements: { summary: { type: "Summary", props: { text: "Mi resumen original" } } } }} />
    </>);
    await english();
    expect(screen.getByText("Example")).toBeVisible();
    expect(screen.getByText(/Move → Example \(Last\).*At the beginning/)).toBeVisible();
    expect(screen.getByRole("heading", { name: "Summary and wrap-up" })).toBeVisible();
    expect(screen.getByText("Mi ejemplo original")).toBeVisible();
    expect(screen.getByText("Mi resumen original")).toBeVisible();
  });

  it("traduce configuración y errores sin perder el valor introducido", async () => {
    render(<ResourceConfigModal phase="engage" resourceId="1" onSave={vi.fn()} onClose={vi.fn()} />);
    const field = screen.getByRole("spinbutton");
    await userEvent.clear(field);
    await userEvent.type(field, "9");
    await userEvent.click(screen.getByRole("button", { name: "Guardar configuración" }));
    await english();
    expect(screen.getByRole("spinbutton", { name: "Panels" })).toHaveValue(9);
    expect(screen.getByText("Number of panels in the generated comic. Between 3 and 8.")).toBeVisible();
    expect(screen.getByText("Enter a whole number between 3 and 8.")).toBeVisible();
  });

  it("traduce el progreso y tiempo restante de un trabajo en curso", async () => {
    render(<ProgressPanel job={{ status: "running", eta: { seconds: 45, basis: "estimado" } }} viewModel={[]} selectedIds={[]} activeId={null} showCancel isStalled={false} resumableCount={0} resuming={false} onToggle={vi.fn()} onRetryOne={vi.fn()} onSelectAll={vi.fn()} onRetrySelected={vi.fn()} onCancel={vi.fn()} onResume={vi.fn()} />);
    await english();
    expect(screen.getByText("Generating resources…")).toBeVisible();
    expect(screen.getByText("Less than 1 min remaining (initial estimate)")).toBeVisible();
  });

  it("traduce subtítulos, alcance y estado del editor con props estables", async () => {
    render(<>
      <WorkspaceOvaPanelTabs tab="preview" onChange={vi.fn()} />
      <ChatScopeToggle selecting count={2} onToggle={vi.fn()} />
      <WorkspacePhaseCodeEditor id="html" value="<p>Mi contenido</p>" dirty saving={false} saved={false} onChange={vi.fn()} onSave={vi.fn()} onDiscard={vi.fn()} />
    </>);
    expect(screen.getByText("Así lo verán tus estudiantes.")).toBeVisible();
    await english();
    expect(screen.getByText("This is how your students will see it.")).toBeVisible();
    expect(screen.getByRole("button", { name: "Apply to: 2 resources" })).toBeVisible();
    expect(screen.getByRole("status")).toHaveTextContent("Unsaved changes.");
    expect(screen.getByRole("textbox")).toHaveValue("<p>Mi contenido</p>");
    await spanish();
    expect(screen.getByText("Así lo verán tus estudiantes.")).toBeVisible();
  });

  it("traduce la validación de creación y el resumen de selección", async () => {
    render(<>
      <CreationSubmitBar prompt="" phases={0} total={0} ready={false} attempted onGenerate={vi.fn()} />
      <PhaseSelectFooter count={3} phases={2} onClose={vi.fn()} onConfirm={vi.fn()} />
    </>);
    await english();
    expect(screen.getByText("To generate, describe the topic and choose resources in at least 2 phases.")).toBeVisible();
    expect(screen.getByRole("status")).toHaveTextContent("3 resources in 2 phases");
  });

  it("traduce nombres y cantidades accesibles de las fases", async () => {
    render(<PhaseSelectTabs phase="engage" picks={{ engage: [{ id: "1", tipo: "Cómic Interactivo" }], explore: [], explain: [], elaborate: [], evaluate: [] }} onChange={vi.fn()} />);
    await english();
    expect(screen.getByRole("button", { name: "Engage: 1 resource selected" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Explore: no resources selected" })).toBeVisible();
  });

  it("traduce opciones y ayuda del tema sin modificar el tema elegido", async () => {
    const onChange = vi.fn();
    render(<OvaThemeSelector theme={{ color: "free", design: "free" }} onChange={onChange} />);
    await english();
    expect(screen.getAllByText("AI chooses")).toHaveLength(2);
    expect(screen.getByText("AI will decide any settings marked ‘AI chooses’.")).toBeVisible();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("traduce el catálogo y sus descripciones con el recurso seleccionado", async () => {
    render(<ResourcePreviewPanel phase="engage" resource={{ id: "1", tipo: "Cómic Interactivo" }} />);
    await english();
    expect(screen.getByRole("heading", { name: "Interactive comic" })).toBeVisible();
    expect(screen.getByText("An HTML page with clickable panels and a final question.")).toBeVisible();
    expect(screen.getByText("3–5 panels in sequence")).toBeVisible();
  });

  it("traduce etiquetas por defecto sin cerrar una respuesta desplegada", async () => {
    render(<><InteractiveReveal id="answer" content="Mi respuesta original" /><ChatProgressBar percentage={35} /></>);
    await userEvent.click(screen.getByRole("button", { name: "Comprobar respuesta" }));
    await english();
    expect(screen.getByRole("button", { name: "Check answer" })).toBeVisible();
    expect(screen.getByText("Mi respuesta original")).toBeVisible();
    expect(screen.getByRole("progressbar", { name: "Regeneration progress" })).toHaveAttribute("aria-valuenow", "35");
  });

  it("los atajos visuales usan el idioma actual y conservan el borrador", async () => {
    const onChangePrompt = vi.fn();
    render(<VisualPromptControls prompt="Mi borrador" onChangePrompt={onChangePrompt} onSubmit={vi.fn()} isProcessing={false} isDisabled={false} statusMessage={null} errorMessage={null} />);
    await english();
    expect(screen.getByRole("textbox")).toHaveValue("Mi borrador");
    await userEvent.click(screen.getByRole("button", { name: "Add summary" }));
    expect(onChangePrompt).toHaveBeenCalledWith("add a summary at the end");
  });

  it("traduce motivos sin perder la valoración ni el comentario", async () => {
    render(<ResourceFeedbackForm initialReason="diseño" initialComment="Mi comentario" pending={false} onSubmit={vi.fn()} />);
    await english();
    expect(screen.getByRole("radio", { name: "Layout" })).toBeChecked();
    expect(screen.getByRole("textbox")).toHaveValue("Mi comentario");
  });

  it("traduce el nivel educativo seleccionado", async () => {
    render(<CreationLevelSelect value="universitario-inicial" onChange={vi.fn()} />);
    await english();
    expect(screen.getByRole("combobox")).toHaveTextContent("University · introductory courses");
  });

  it("traduce estado de archivos y formatea tamaños y caracteres", async () => {
    render(<>
      <FileChip file={{ clientId: "1", uploadId: "1", filename: "guía.pdf", contentType: "application/pdf", sizeBytes: 1572864, status: "success", message: "", ragStatus: { status: "indexed", chunks: 2 } }} onRemove={vi.fn()} />
      <HtmlCodeView content={"a".repeat(12345)} />
    </>);
    await english();
    expect(screen.getByText("Ready · 2 excerpts")).toBeVisible();
    expect(screen.getByText(/1\.5 MB/)).toBeVisible();
    expect(screen.getByText("12,345 characters")).toBeVisible();
  });

  it("la ayuda del compositor sigue el idioma sin tocar el mensaje", async () => {
    const uploads = { data: [], uploading: true, indexing: false } as unknown as Parameters<typeof ChatComposer>[0]["uploads"];
    render(<ChatComposer prompt="Mi mensaje" onPrompt={vi.fn()} onSubmit={vi.fn()} busy={false} uploads={uploads} />);
    await english();
    expect(screen.getByText("Uploading files…")).toBeVisible();
    expect(screen.getByRole("textbox")).toHaveValue("Mi mensaje");
  });
});
