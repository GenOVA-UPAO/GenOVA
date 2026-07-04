import type { Meta, StoryObj } from "@storybook/angular";

import type { PhaseWithContent } from "../../lib/types";
import { WorkspaceHtmlPreviewComponent } from "./workspace-html-preview.component";

const samplePhases: PhaseWithContent[] = [
  {
    id: "phase-1",
    phase_type: "engage",
    title: "Video introductorio",
    content: `<!doctype html><html><body style="font-family: sans-serif; padding: 1.5rem;"><h1>¿Sabías que...?</h1><p>Contenido HTML del recurso de enganche.</p></body></html>`,
  },
  {
    id: "phase-2",
    phase_type: "explore",
    title: "Simulador interactivo",
    content: `<!doctype html><html><body style="font-family: sans-serif; padding: 1.5rem;"><h1>Explora</h1><p>Contenido del recurso de exploración.</p></body></html>`,
    regenerated: true,
  },
  {
    id: "phase-3",
    phase_type: "evaluate",
    title: "Quiz final",
    content: `<!doctype html><html><body style="font-family: sans-serif; padding: 1.5rem;"><h1>Evalúa lo aprendido</h1></body></html>`,
  },
];

const meta: Meta<WorkspaceHtmlPreviewComponent> = {
  component: WorkspaceHtmlPreviewComponent,
  title: "Features/OvaWorkspace/Editor/WorkspaceHtmlPreview",
  tags: ["autodocs"],
  args: {
    phases: samplePhases,
  },
};
export default meta;

type Story = StoryObj<WorkspaceHtmlPreviewComponent>;

export const Default: Story = {};

export const SinglePhase: Story = {
  args: { phases: [samplePhases[0]] },
};

export const Empty: Story = {
  args: { phases: [] },
};
