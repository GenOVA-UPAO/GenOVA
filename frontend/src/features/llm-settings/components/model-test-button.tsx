import { useState } from "react";

import { Button } from "@/core/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/core/components/ui/popover";

import { useModelTest } from "../hooks/use-model-test";
import { isAllowedProvider, useOwnKeyProviders } from "../hooks/use-own-key-providers";
import { ModelTestIcon } from "./model-test-icon";
import { ModelTestResultView } from "./model-test-result";

export interface ModelTestButtonProps {
  provider: string;
  modelId: string;
  disabled?: boolean;
}

/** Proveedores de texto: los de imagen no se prueban con una llamada de chat. */
const TESTABLE_PROVIDERS = new Set(["groq", "openrouter", "opencode", "huggingface"]);

/**
 * «Probar»: llamada mínima al modelo con la clave que se usaría de verdad (la de
 * la plataforma para el admin, la propia para un usuario) y el resultado al
 * momento en un globo junto al botón: latencia y el principio de la respuesta,
 * o qué falló y qué hacer. No se muestra para modelos de imagen ni para
 * proveedores sin clave propia (a un usuario no le toca probar los de la plataforma).
 */
export function ModelTestButton({
  provider,
  modelId,
  disabled = false,
}: Readonly<ModelTestButtonProps>) {
  const allowed = useOwnKeyProviders();
  const [open, setOpen] = useState(false);
  const test = useModelTest(provider, modelId);

  if (!canTest(provider, allowed)) return null;

  const run = () => {
    setOpen(true);
    test.run();
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="shrink-0 max-sm:h-11"
          disabled={disabled || !modelId}
          aria-busy={test.running}
          aria-label={`Probar el modelo ${modelId}`}
          onClick={(event) => {
            // Cada clic lanza una prueba nueva (no alterna el globo).
            event.preventDefault();
            if (!test.running) run();
          }}
        >
          <ModelTestIcon running={test.running} current={test.current} />
          {test.running ? "Probando…" : "Probar"}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-80 max-w-[calc(100vw-2rem)] p-4"
        // El foco se queda en el botón: el resultado se anuncia (región viva).
        onOpenAutoFocus={(event) => {
          event.preventDefault();
        }}
      >
        <ModelTestResultView
          running={test.running}
          result={test.result}
          error={test.error}
          onRetry={run}
        />
      </PopoverContent>
    </Popover>
  );
}

function canTest(provider: string, allowed: Set<string> | null): boolean {
  return TESTABLE_PROVIDERS.has(provider) && isAllowedProvider(allowed, provider);
}
