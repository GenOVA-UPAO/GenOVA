import { useCallback } from "react";
import { useSearchParams } from "react-router";

/**
 * Pestaña activa reflejada en la URL (`?tab=`): se puede enlazar, recarga en la misma
 * pestaña y el botón Atrás no pierde el contexto. La pestaña por defecto no ensucia la URL.
 */
export function useTabParam(
  allowed: readonly string[],
  fallback: string,
): [string, (next: string) => void] {
  const [params, setParams] = useSearchParams();
  const raw = params.get("tab");
  const tab = raw !== null && allowed.includes(raw) ? raw : fallback;
  const setTab = useCallback(
    (next: string) => {
      setParams(
        (prev) => {
          const copy = new URLSearchParams(prev);
          if (next === fallback) copy.delete("tab");
          else copy.set("tab", next);
          return copy;
        },
        { replace: true },
      );
    },
    [fallback, setParams],
  );
  return [tab, setTab];
}
