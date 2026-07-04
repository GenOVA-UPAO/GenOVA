import type { Meta, StoryObj } from "@storybook/angular";

import { HtmlPreviewFrameComponent } from "./html-preview-frame.component";

const sampleHtml = `<!doctype html>
<html>
  <body style="font-family: sans-serif; padding: 2rem;">
    <h1>Vista previa del recurso</h1>
    <p>Contenido HTML renderizado dentro del iframe sandboxed.</p>
  </body>
</html>`;

const meta: Meta<HtmlPreviewFrameComponent> = {
  component: HtmlPreviewFrameComponent,
  title: "Core/HtmlPreviewFrame",
  tags: ["autodocs"],
  args: {
    html: sampleHtml,
    height: "300px",
    title: "Vista previa del recurso",
  },
};
export default meta;

type Story = StoryObj<HtmlPreviewFrameComponent>;

export const Default: Story = {};

export const Empty: Story = {
  args: { html: "" },
};
