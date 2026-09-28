import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { EngineNode } from "../hooks/nodes-config.types";
import { withNodeCopy } from "../lib/node-copy";
import { CapabilityRow } from "./capability-row";

const audio: EngineNode = withNodeCopy({
  id: "audio",
  name: "Narración de audio",
  role: "Medios",
  flag: "",
  media_task: "audio",
});

function renderAudio(media: Parameters<typeof CapabilityRow>[0]["media"]) {
  render(
    <ul>
      <CapabilityRow cap={audio} active={false} saving={false} media={media} onToggle={vi.fn()} />
    </ul>,
  );
}

describe("CapabilityRow: narración de audio", () => {
  it("activa con OpenRouter: voz en español, sin interruptor", () => {
    renderAudio({
      state: "active",
      model_id: "openai/gpt-audio-mini",
      label: "OpenAI GPT Audio Mini",
    });
    expect(screen.getByText("Narración de audio")).toBeTruthy();
    expect(screen.getByText("Activo").className).toContain("text-success-strong");
    expect(
      screen.getByText("Ahora: voz en español con OpenAI GPT Audio Mini (OpenRouter)."),
    ).toBeTruthy();
    expect(screen.queryByRole("switch")).toBeNull();
  });

  it("solo con Groq: aviso de que es en inglés", () => {
    renderAudio({
      state: "english_only",
      model_id: "canopylabs/orpheus-v1-english",
      label: "Groq Orpheus",
    });
    expect(screen.getByText("Solo en inglés").className).toContain("text-accent-brand");
    expect(screen.getByText(/solo en inglés con Groq Orpheus/)).toBeTruthy();
  });

  it("sin claves: el micro-podcast queda en texto", () => {
    renderAudio({ state: "off" });
    expect(screen.getByText("Desactivado").className).toContain("text-muted-foreground");
    expect(screen.getByText(/el micro-podcast queda solo en texto/)).toBeTruthy();
  });
});
