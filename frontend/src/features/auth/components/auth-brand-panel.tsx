import { useTranslation } from "react-i18next";

const PHASE_KEYS = ["hook", "exploration", "explanation", "elaboration", "evaluation"] as const;

/**
 * Columna de marca de las pantallas de acceso (solo escritorio): explica qué hace
 * GenOVA con el propio modelo 5E, que es lo que el docente va a obtener.
 */
export function AuthBrandPanel() {
  const { t } = useTranslation("auth");

  return (
    <aside className="relative hidden overflow-hidden bg-brand-surface text-brand-surface-foreground lg:flex lg:flex-col lg:justify-between lg:px-12 lg:py-10 xl:px-16">
      <p className="font-display text-2xl font-semibold tracking-tight">GenOVA</p>
      <div className="max-w-lg">
        <h2 className="font-display text-4xl leading-[1.1] font-semibold tracking-tight xl:text-[2.75rem]">
          {t("brand.headline")}
        </h2>
        <ol className="mt-10 space-y-5">
          {PHASE_KEYS.map((phaseKey, index) => (
            <li key={phaseKey} className="grid grid-cols-[2rem_1fr] gap-x-3">
              <span
                aria-hidden="true"
                className="flex size-7 items-center justify-center rounded-full border border-brand-surface-foreground/30 text-xs font-semibold tabular-nums"
              >
                {index + 1}
              </span>
              <p className="text-sm leading-snug">
                <span className="font-semibold">{t(`brand.phases.${phaseKey}.name`)}.</span>{" "}
                <span className="text-brand-surface-foreground/75">{t(`brand.phases.${phaseKey}.text`)}</span>
              </p>
            </li>
          ))}
        </ol>
      </div>
      <p className="text-xs text-brand-surface-foreground/65">
        {t("brand.footer")}
      </p>
    </aside>
  );
}
