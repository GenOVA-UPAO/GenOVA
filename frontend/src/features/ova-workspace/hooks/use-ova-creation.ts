import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate } from "react-router";

import { startOvaJob } from "../api/ova-jobs.api";
import type { CreationModal } from "../components/creation/creation-toolbar";
import { canCreate } from "../lib/creation-form";
import {
  type EducationLevelId,
  loadEducationLevel,
  NIVEL_STORAGE_KEY,
  promptWithLevel,
} from "../lib/education-levels";
import {
  emptyPicks,
  type PhaseResourceMap,
  type ResourceConfigs,
} from "../lib/phase-select.config";
import type { OvaTheme } from "../lib/types";
import { useResourceConfigs } from "./use-resource-configs";
import { useOvaUploads } from "./use-uploads";

const DEFAULT_THEME: OvaTheme = { color: "upao", design: "upao" };

export function useOvaCreation() {
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState("");
  const [picks, setPicks] = useState(emptyPicks);
  const [theme, setTheme] = useState(DEFAULT_THEME);
  const [nivel, setNivelState] = useState<EducationLevelId>(() => loadEducationLevel(localStorage));
  const [modal, setModal] = useState<CreationModal>();
  const [replay, setReplay] = useState(0);
  const uploads = useOvaUploads();
  const configs = useResourceConfigs();
  const start = useMutation({
    mutationFn: startOvaJob,
    onSuccess: (job) => {
      void navigate(`/crear?jobId=${encodeURIComponent(job.job_id)}`);
    },
  });
  const setNivel = (next: EducationLevelId) => {
    setNivelState(next);
    localStorage.setItem(NIVEL_STORAGE_KEY, next);
  };
  const phases = Object.values(picks).filter((items) => items.length > 0).length;
  const total = Object.values(picks).flat().length;
  const busy = [start.isPending, uploads.uploading, configs.save.isPending].some(Boolean);
  const ready = canCreate(prompt, phases, busy);
  const generate = () => {
    if (!ready) return;
    start.mutate({
      prompt: promptWithLevel(prompt, nivel),
      theme,
      resourceConfigs: configs.data?.configs,
      uploadIds: (uploads.data ?? []).flatMap((file) => (file.uploadId ? [file.uploadId] : [])),
      resources: Object.entries(picks).flatMap(([phase, resources]) =>
        // La API exige el tipo como texto: enviarlo como número devolvía 422 y
        // la generación no arrancaba desde el formulario.
        resources.map((resource) => ({ phase_type: phase, resource_type: String(resource.id) })),
      ),
    });
  };
  const closeModal = () => {
    setModal(undefined);
  };
  const confirmSelections = (next: PhaseResourceMap, settings: ResourceConfigs) => {
    setPicks(next);
    configs.save.mutate(settings);
    closeModal();
  };
  const replayTour = () => {
    setReplay((value) => value + 1);
  };
  const error = start.error?.message ?? uploads.uploadError;
  return {
    closeModal,
    configs,
    confirmSelections,
    error,
    generate,
    modal,
    nivel,
    openModal: setModal,
    phases,
    picks,
    prompt,
    ready,
    replay,
    replayTour,
    setNivel,
    setPrompt,
    setTheme,
    theme,
    total,
    uploads,
  };
}
