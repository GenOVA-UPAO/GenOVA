import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";

import { Icon } from "@/core/components/icon";
import { cn } from "@/core/lib/cn";

import type { VisualElement, VisualSpec } from "../../lib/visual-editor.types";
import {
  renderComicPanel,
  renderExample,
  renderHeader,
  renderParagraph,
  renderQuestion,
  renderReveal,
  renderSummary,
} from "./element-renderers";

interface Props {
  spec: VisualSpec | null;
  className?: string;
}

function renderLeaf(id: string, element: VisualElement, t: TFunction): React.ReactElement {
  switch (element.type) {
    case "Header":
      return renderHeader(id, element.props);
    case "Paragraph":
      return renderParagraph(id, element.props);
    case "Example":
      return renderExample(id, element.props, t);
    case "Question":
      return renderQuestion(id, element.props);
    case "Reveal":
      return renderReveal(id, element.props);
    case "Summary":
      return renderSummary(id, element.props, t);
    case "ComicPanel":
      return renderComicPanel(id, element.props, t);
    default:
      return (
        <div key={id} className="rounded border border-border p-2 text-xs text-muted-foreground">
          [{element.type}]
        </div>
      );
  }
}

function renderElementNode(
  id: string,
  element: VisualElement,
  elements: Record<string, VisualElement | undefined>,
  t: TFunction,
): React.ReactElement {
  if (element.type === "Stack") {
    const isHorizontal = element.props.direction === "horizontal";
    const children = element.children ?? [];
    return (
      <div
        key={id}
        className={cn(
          "flex w-full min-w-0 gap-4",
          isHorizontal ? "flex-row" : "flex-col"
        )}
      >
        {children.map((childId) => {
          const child = elements[childId];
          return child ? renderElementNode(childId, child, elements, t) : null;
        })}
      </div>
    );
  }

  return renderLeaf(id, element, t);
}

export function VisualSpecRenderer({ spec, className }: Readonly<Props>) {
  const { t } = useTranslation();
  const rootId = spec?.root;
  const rootEl = rootId ? spec.elements[rootId] : undefined;

  if (!rootId || !rootEl) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border p-6 text-center text-muted-foreground">
        <Icon name="sparkle" className="size-8 text-muted-foreground/60" />
        <p className="text-sm font-medium">{t("workspace:sin_contenido_para_previsualizar")}</p>
        <p className="text-xs">{t("workspace:visualPreviewEmptyHint")}</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4 rounded-xl border border-border bg-card p-4 sm:p-6 shadow-xs", className)}>
      {renderElementNode(rootId, rootEl, spec.elements, t)}
    </div>
  );
}
