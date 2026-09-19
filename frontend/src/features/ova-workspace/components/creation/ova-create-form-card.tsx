import { EXAMPLE_PROMPT } from "../../lib/creation-form";
import type { OvaTheme } from "../../lib/types";
import type { UploadItem } from "../../lib/upload-types";
import { FileChips } from "../shared/file-chips";
import { CreationSteps } from "./creation-steps";
import { type CreationModal, CreationToolbar } from "./creation-toolbar";

interface Props {
  prompt: string;
  onPrompt: (prompt: string) => void;
  ready: boolean;
  phases: number;
  total: number;
  theme: OvaTheme;
  files: UploadItem[];
  onRemove: (id: string) => void;
  onOpen: (modal: CreationModal) => void;
  onGenerate: () => void;
  onTour: () => void;
  error?: string;
}
export function OvaCreateFormCard(props: Readonly<Props>) {
  const missing = Math.max(0, 10 - props.prompt.trim().length);
  const theme = `Color: ${props.theme.color === "free" ? "Libre" : "UPAO"} · Diseño: ${props.theme.design === "free" ? "Libre" : "UPAO"}`;
  return (
    <div className="mx-auto w-full max-w-4xl space-y-5 px-4 py-8">
      <header className="text-center">
        <h1 className="font-display text-3xl font-semibold sm:text-4xl">Crear nuevo OVA</h1>
        <p className="mt-1.5 text-sm font-medium text-muted-foreground">Describe el tema y configura los recursos a generar con IA</p>
      </header>
      <CreationSteps describeDone={missing === 0} resourcesDone={props.phases >= 2} generateReady={props.ready} onTour={props.onTour} />
      <section id="tour-crear-ova-prompt" className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <label htmlFor="ova-create-prompt" className="sr-only">
          Describe el tema del OVA
        </label>
        <textarea
          id="ova-create-prompt"
          rows={5}
          className="w-full resize-none bg-transparent p-5 focus-visible:ring-2 focus-visible:ring-ring"
          placeholder="Describe el tema, objetivos de aprendizaje y nivel educativo del OVA… (mín. 10 caracteres)"
          value={props.prompt}
          onChange={(event) => {
            props.onPrompt(event.target.value);
          }}
          onKeyDown={(event) => {
            if (event.ctrlKey && event.key === "Enter" && props.ready) {
              event.preventDefault();
              props.onGenerate();
            }
          }}
        />
        <div className="space-y-3 px-5 pb-4">
          <button
            type="button"
            aria-label="Usar ejemplo de prompt"
            className="text-xs font-medium text-primary hover:underline"
            onClick={() => {
              props.onPrompt(EXAMPLE_PROMPT);
            }}
          >
            Usar ejemplo de prompt
          </button>
          <FileChips files={props.files} onRemove={props.onRemove} />
          <p className="text-xs">
            {props.total} recursos · {props.phases} fases
          </p>
          <button
            type="button"
            className="rounded-full border bg-muted/60 px-3 py-1 text-xs"
            onClick={() => {
              props.onOpen("theme");
            }}
          >
            {theme}
          </button>
        </div>
        <CreationToolbar ready={props.ready} onOpen={props.onOpen} onGenerate={props.onGenerate} />
        <div className="space-y-2 px-5 pb-3 text-xs text-muted-foreground">
          {missing > 0 && <p>Faltan {missing} caracteres para generar</p>}
          {props.phases < 2 && <p>Selecciona recursos en al menos 2 fases (falta {2 - props.phases})</p>}
          {props.error && (
            <p role="alert" aria-live="polite" className="text-destructive">
              {props.error}
            </p>
          )}
        </div>
      </section>
      <p className="text-center text-xs text-muted-foreground sm:hidden">Pulsa Generar cuando termines</p>
      <p className="hidden text-center text-xs text-muted-foreground sm:block">Ctrl+Enter para generar</p>
    </div>
  );
}
