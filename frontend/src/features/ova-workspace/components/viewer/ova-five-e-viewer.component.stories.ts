import type { Meta, StoryObj } from "@storybook/angular";

import { OvaFiveEViewerComponent } from "./ova-five-e-viewer.component";
import type { OvaContent } from "./ova-five-e-viewer.helpers";

const sampleContent: OvaContent = {
  title: "Modelo 5E — Enganche",
  phases: [
    {
      id: "enganche",
      order: 1,
      label: "Enganche",
      sections: [
        { type: "heading", content: "¿Sabías que...?" },
        {
          type: "paragraph",
          content:
            "Vista previa estructurada del recurso generado. El contenido final se renderiza como HTML interactivo tras la generación con IA.",
        },
        {
          type: "list",
          ordered: true,
          items: [
            "Selecciona un tipo de recurso",
            "Define el concepto de ML",
            "Genera y revisa la vista previa",
          ],
        },
        {
          type: "code",
          language: "python",
          content: "def f(x):\n    return x ** 2",
        },
        {
          type: "image",
          src: "https://placehold.co/400x200",
          alt: "Diagrama de ejemplo",
        },
      ],
    },
    {
      id: "exploracion",
      order: 2,
      label: "Exploración",
      sections: [
        { type: "heading", content: "Explora el fenómeno" },
        {
          type: "list",
          ordered: false,
          items: ["Observa el simulador", "Registra tus hipótesis"],
        },
      ],
    },
  ],
};

const meta: Meta<OvaFiveEViewerComponent> = {
  component: OvaFiveEViewerComponent,
  title: "Features/OvaWorkspace/Viewer/OvaFiveEViewer",
  tags: ["autodocs"],
  args: {
    content: sampleContent,
  },
};
export default meta;

type Story = StoryObj<OvaFiveEViewerComponent>;

export const Default: Story = {};

export const SinglePhase: Story = {
  args: {
    content: { title: sampleContent.title, phases: [sampleContent.phases![0]] },
  },
};

export const Empty: Story = {
  args: { content: null },
};
