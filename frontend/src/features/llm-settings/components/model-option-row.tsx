import { Icon } from "@/core/components/icon";
import { cn } from "@/core/lib/cn";

import { formatContext, priceSummary } from "../lib/model-facts";
import { type ModelOption, optionAccessibleName } from "../lib/model-search";
import { usageSummary } from "../lib/model-usage";
import { ModelCapabilities } from "./model-capabilities";
import { OptionPrice } from "./option-price";

interface ModelOptionRowProps {
  id: string;
  option: ModelOption;
  selected: boolean;
  active: boolean;
  onHover: () => void;
  onPick: () => void;
}

/**
 * Una opción del selector: nombre y precio arriba; proveedor, contexto,
 * capacidades y dónde se usa, debajo. Lo necesario para decidir sin salir.
 */
export function ModelOptionRow({
  id,
  option,
  selected,
  active,
  onHover,
  onPick,
}: Readonly<ModelOptionRowProps>) {
  const context = formatContext(option.facts.context);
  const price = priceSummary(option.facts);
  return (
    // El teclado lo gestiona el buscador (aria-activedescendant): las opciones no reciben foco.
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events -- patrón combobox de ARIA
    <div
      id={id}
      role="option"
      tabIndex={-1}
      aria-selected={selected}
      aria-label={optionAccessibleName(option)}
      onPointerMove={onHover}
      onClick={onPick}
      className={cn(
        "flex min-h-11 scroll-mt-8 cursor-default items-center gap-3 rounded-lg px-2.5 py-2 text-sm [contain-intrinsic-size:auto_3.25rem] [content-visibility:auto]",
        active && "bg-accent text-accent-foreground",
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-1.5">
          {option.favorite ? (
            <Icon name="star" weight="fill" size="text-xs" className="text-accent-brand" />
          ) : null}
          <span className={cn("truncate", selected && "font-medium")} title={option.name}>
            {option.name}
          </span>
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
          <span>{option.providerLabel}</span>
          {context ? <span className="tabular-nums">{context} de contexto</span> : null}
          <ModelCapabilities capabilities={option.facts.capabilities} />
          {option.usage.length > 0 ? (
            <span className="text-primary">En {usageSummary(option.usage)}</span>
          ) : null}
        </div>
      </div>
      <OptionPrice price={price} free={option.facts.free} />
      <Icon
        name="check"
        size="text-sm"
        className={cn("shrink-0 text-primary", !selected && "invisible")}
      />
    </div>
  );
}
