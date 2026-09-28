import { useMutation } from "@tanstack/react-query";
import { useState } from "react";

import { useIsAdmin } from "@/core/auth/auth-store";

import { type ModelTestResult, testModel } from "../api/model-tools.api";
import { errorMessage } from "./error-message";

export interface ModelTestState {
  /** Para qué modelo es el resultado: al cambiar de modelo, el anterior deja de valer. */
  target: string;
  result: ModelTestResult | null;
  /** La petición misma falló (sin permiso, límite de pruebas, sin red). */
  error: string | null;
}

/** «Probar» un modelo: el admin con la clave de la plataforma, un usuario con la suya. */
export function useModelTest(provider: string, modelId: string) {
  const isAdmin = useIsAdmin();
  const [state, setState] = useState<ModelTestState | null>(null);
  const mutation = useMutation({
    mutationFn: (vars: { provider: string; modelId: string }) =>
      testModel(vars.provider, vars.modelId, isAdmin),
    onSuccess: (result, vars) => {
      setState({ target: `${vars.provider}/${vars.modelId}`, result, error: null });
    },
    onError: (err, vars) => {
      setState({
        target: `${vars.provider}/${vars.modelId}`,
        result: null,
        error: errorMessage(err, "No se pudo probar el modelo."),
      });
    },
  });
  const target = `${provider}/${modelId}`;
  const current = state?.target === target ? state : null;
  return {
    running: mutation.isPending,
    current,
    result: current?.result ?? null,
    error: current?.error ?? null,
    run: () => {
      mutation.mutate({ provider, modelId });
    },
  };
}
