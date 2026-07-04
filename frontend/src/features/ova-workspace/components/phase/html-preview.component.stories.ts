import type { Meta, StoryObj } from "@storybook/angular";

import type { PreviewResult } from "@/core/lib/ova-types";

import { HtmlPreviewComponent } from "./html-preview.component";

const sampleResult: PreviewResult = {
  html_content: `<!doctype html>
<html>
  <body style="font-family: sans-serif; padding: 2rem;">
    <h1>¿Sabías que...?</h1>
    <p>Contenido HTML generado por IA para el recurso seleccionado.</p>
  </body>
</html>`,
  resource_type: "video",
  concepto: "Segunda ley de Newton",
  emoji: "🎯",
  tipo: "Video introductorio",
  duracion: "3 min",
  interactividad: "Alta",
};

const meta: Meta<HtmlPreviewComponent> = {
  component: HtmlPreviewComponent,
  title: "Features/OvaWorkspace/Phase/HtmlPreview",
  tags: ["autodocs"],
  args: {
    result: sampleResult,
  },
};
export default meta;

type Story = StoryObj<HtmlPreviewComponent>;

export const Default: Story = {};

export const NoResult: Story = {
  args: { result: undefined },
};
