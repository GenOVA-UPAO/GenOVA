import { useEffect, useRef } from "react";

import type { CatalogBrowser } from "../hooks/use-catalog-browser";
import { useFavoriteActions } from "../hooks/use-favorite-actions";
import { useLlmSettings } from "../hooks/use-llm-settings";
import { ManageModelRow } from "./manage-model-row";
import { ManageModelsFooter } from "./manage-models-footer";

interface ManageModelsListProps {
  browser: CatalogBrowser;
  usage: Record<string, string[]>;
}

/**
 * Lista del catálogo con cabecera de columnas fija. Se pintan 60 filas y el
 * resto al acercarse al final: con cientos de modelos abría con tirones.
 */
export function ManageModelsList({ browser, usage }: Readonly<ManageModelsListProps>) {
  const store = useLlmSettings();
  const favorites = useFavoriteActions();
  const sentinel = useRef<HTMLDivElement>(null);
  const scrollRoot = useRef<HTMLDivElement>(null);
  const hasMore = browser.visible.length < browser.results.length;
  const { showMore } = browser;

  useEffect(() => {
    const el = sentinel.current;
    if (!el || !hasMore) return undefined;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) showMore();
      },
      { rootMargin: "400px", root: scrollRoot.current },
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
    };
  }, [hasMore, showMore]);

  return (
    <div ref={scrollRoot} className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
      <div
        aria-hidden="true"
        className="sticky top-0 z-10 hidden grid-cols-[1fr_5rem_5rem_4.5rem] gap-3 border-b border-border bg-popover py-2 pr-5 pl-[4.25rem] text-xs text-muted-foreground sm:grid"
      >
        <span>Modelo</span>
        <span className="text-right">Entrada</span>
        <span className="text-right">Salida</span>
        <span className="text-right">Contexto</span>
      </div>
      <ul className="divide-y divide-border" aria-label="Modelos del catálogo">
        {browser.visible.map((model) => {
          const key = `${model.provider}::${model.model_id}`;
          const base = store.isDefaultModel(model.provider, model.model_id);
          return (
            <ManageModelRow
              key={key}
              model={model}
              base={base}
              favorite={base || store.isModelEnabled(model.provider, model.model_id)}
              usage={usage[key] ?? []}
              onToggle={(provider, modelId) => {
                browser.holdPlace(model);
                return favorites.toggle(provider, modelId);
              }}
            />
          );
        })}
      </ul>
      <div ref={sentinel} className="h-1" />
      <ManageModelsFooter hasMoreRows={hasMore} onShowMore={browser.showMore} />
    </div>
  );
}
