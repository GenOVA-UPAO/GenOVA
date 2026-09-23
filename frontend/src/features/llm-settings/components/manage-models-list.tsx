import { useEffect, useRef } from "react";

import { useLlmSettings } from "../hooks/use-llm-settings";
import type { CatalogGroup } from "../lib/catalog-sort";
import { ManageModelRow } from "./manage-model-row";
import { ManageModelsFooter } from "./manage-models-footer";

interface ManageModelsListProps {
  grouped: CatalogGroup[];
}

export function ManageModelsList({ grouped }: Readonly<ManageModelsListProps>) {
  const store = useLlmSettings();
  const sentinel = useRef<HTMLDivElement>(null);
  const scrollRoot = useRef<HTMLDivElement>(null);
  const canLoadMore = store.fullHasMore && !store.loadingMore && !store.loading;

  useEffect(() => {
    const el = sentinel.current;
    if (!el) return undefined;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && canLoadMore) store.loadMore();
      },
      { rootMargin: "200px", root: scrollRoot.current },
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
    };
  }, [canLoadMore, store]);

  return (
    <div ref={scrollRoot} className="min-h-0 flex-1 overflow-y-auto">
      <div className="divide-y divide-border">
        {grouped.map((entry) => (
          <section key={entry.key} aria-label={entry.label} className="px-3 py-3">
            <h3 className="mb-1 flex items-baseline gap-2 px-2 text-sm font-medium">
              {entry.label}
              <span className="text-xs font-normal text-muted-foreground tabular-nums">
                {entry.models.length === 1 ? "1 modelo" : `${String(entry.models.length)} modelos`}
              </span>
              {store.groupBy === "provider" && (entry.key === "groq" || entry.key === "huggingface") ? (
                <span className="text-xs font-normal text-success-strong">Gratuito</span>
              ) : null}
            </h3>
            {entry.models.map((model) => {
              const locked = store.isDefaultModel(model.provider, model.model_id);
              return (
                <ManageModelRow
                  key={`${model.provider}:${model.model_id}`}
                  model={model}
                  locked={locked}
                  enabled={store.isModelEnabled(model.provider, model.model_id) || locked}
                  onToggle={store.toggleFavorite}
                />
              );
            })}
          </section>
        ))}
        <div ref={sentinel} className="h-1" />
        <ManageModelsFooter />
      </div>
    </div>
  );
}
