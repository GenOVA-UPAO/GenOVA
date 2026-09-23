import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import * as api from "../api/ova-jobs.api";
import { NIVEL_STORAGE_KEY } from "../lib/education-levels";
import { emptyPicks } from "../lib/phase-select.config";
import { useOvaCreation } from "./use-ova-creation";

vi.mock("react-router", () => ({ useNavigate: () => vi.fn() }));
vi.mock("../api/ova-jobs.api", () => ({
  startOvaJob: vi.fn(() => Promise.resolve({ job_id: "job-1", status: "running" })),
}));
vi.mock("./use-resource-configs", () => ({
  useResourceConfigs: () => ({
    data: { configs: {} },
    save: { isPending: false, mutate: vi.fn() },
  }),
}));
vi.mock("./use-uploads", () => ({
  useOvaUploads: () => ({
    data: [],
    uploading: false,
    uploadError: undefined,
    removeUpload: vi.fn(),
    addFiles: vi.fn(),
  }),
}));

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return renderHook(useOvaCreation, {
    wrapper: ({ children }: PropsWithChildren) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    ),
  });
}

function twoPhasePicks() {
  return { ...emptyPicks(), engage: [{ id: "r1" }], explain: [{ id: "r2" }] };
}

function sentPayload() {
  const calls = vi.mocked(api.startOvaJob).mock.calls;
  return calls.length > 0 ? calls[0][0] : undefined;
}

describe("useOvaCreation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });
  it("appends the default education level line to the prompt sent to the API", async () => {
    const { result } = setup();
    act(() => {
      result.current.setPrompt("Tema: la fotosíntesis");
      result.current.confirmSelections(twoPhasePicks(), {});
    });
    await act(async () => {
      result.current.generate();
      await Promise.resolve();
    });
    expect(sentPayload()).toMatchObject({
      prompt: "Tema: la fotosíntesis\n\nNivel educativo: universitario (ciclos iniciales).",
    });
  });
  it("uses the chosen level and remembers it in localStorage", async () => {
    const { result } = setup();
    act(() => {
      result.current.setNivel("posgrado");
      result.current.setPrompt("Tema: topología de redes");
      result.current.confirmSelections(twoPhasePicks(), {});
    });
    expect(localStorage.getItem(NIVEL_STORAGE_KEY)).toBe("posgrado");
    await act(async () => {
      result.current.generate();
      await Promise.resolve();
    });
    expect(sentPayload()).toMatchObject({
      prompt: "Tema: topología de redes\n\nNivel educativo: posgrado.",
    });
  });
  it("does not duplicate the level when the prompt already states it, ignoring case", async () => {
    const { result } = setup();
    const stated = "NIVEL EDUCATIVO: secundaria.\nTema: la fotosíntesis";
    act(() => {
      result.current.setPrompt(stated);
      result.current.confirmSelections(twoPhasePicks(), {});
    });
    await act(async () => {
      result.current.generate();
      await Promise.resolve();
    });
    expect(sentPayload()).toMatchObject({ prompt: stated });
  });
});
