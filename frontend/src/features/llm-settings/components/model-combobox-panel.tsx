import { useEffect, useId } from "react";

import { Icon } from "@/core/components/icon";
import { cn } from "@/core/lib/cn";

import type { useModelCombobox } from "../hooks/use-model-combobox";
import { ModelComboboxFooter } from "./model-combobox-footer";

type ComboboxState = ReturnType<typeof useModelCombobox>;

interface ModelComboboxPanelProps {
  state: ComboboxState;
  current: string;
  label: string;
}

/** Buscador + lista de modelos (patrón combobox de ARIA con aria-activedescendant). */
export function ModelComboboxPanel({ state, current, label }: Readonly<ModelComboboxPanelProps>) {
  const listId = useId();
  const optionId = (index: number) => `${listId}-opt-${String(index)}`;
  const activeId = state.visible.length > 0 ? optionId(state.active) : undefined;

  useEffect(() => {
    if (activeId) document.getElementById(activeId)?.scrollIntoView({ block: "nearest" });
  }, [activeId]);

  return (
    <div className="flex max-h-[min(26rem,var(--radix-popover-content-available-height))] flex-col">
      <div className="flex items-center gap-2 border-b border-border px-3">
        <Icon name="magnifying-glass" size="text-base" className="shrink-0 text-muted-foreground" />
        <input
          type="text"
          role="combobox"
          aria-label={`Buscar: ${label}`}
          aria-expanded="true"
          aria-controls={listId}
          aria-activedescendant={activeId}
          aria-autocomplete="list"
          autoComplete="off"
          spellCheck={false}
          placeholder="Buscar por nombre o proveedor…"
          value={state.query}
          onChange={(event) => {
            state.onQuery(event.target.value);
          }}
          onKeyDown={state.onKeyDown}
          className="h-11 w-full min-w-0 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>
      <ul id={listId} role="listbox" aria-label={label} className="min-h-0 flex-1 overflow-y-auto p-1">
        {state.visible.map((option, index) => (
          // El teclado lo gestiona el buscador (aria-activedescendant): las opciones no reciben foco.
          // eslint-disable-next-line jsx-a11y/click-events-have-key-events -- patrón combobox de ARIA
          <li
            key={option.value}
            id={optionId(index)}
            role="option"
            aria-selected={option.value === current}
            onPointerMove={() => {
              state.setActive(index);
            }}
            onClick={() => {
              state.pick(option.value);
            }}
            className={cn(
              "flex min-h-9 cursor-default items-center gap-2 rounded-md px-2 py-1.5 text-sm",
              index === state.active && "bg-accent text-accent-foreground",
            )}
          >
            <span className="min-w-0 flex-1 truncate" title={option.name}>
              {option.name}
            </span>
            <span className="shrink-0 text-xs text-muted-foreground">{option.providerLabel}</span>
            <Icon
              name="check"
              size="text-sm"
              className={cn("shrink-0 text-primary", option.value !== current && "invisible")}
            />
          </li>
        ))}
      </ul>
      <ModelComboboxFooter shown={state.visible.length} total={state.total} query={state.query} />
    </div>
  );
}
