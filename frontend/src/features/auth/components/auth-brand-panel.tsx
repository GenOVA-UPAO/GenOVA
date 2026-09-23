const PHASES = [
  { name: "Enganche", text: "Una pregunta o un cómic que despierta la curiosidad." },
  { name: "Exploración", text: "Simulaciones y actividades para descubrir el concepto." },
  { name: "Explicación", text: "La teoría, con ejemplos resueltos paso a paso." },
  { name: "Elaboración", text: "Casos para aplicar lo aprendido a situaciones nuevas." },
  { name: "Evaluación", text: "Preguntas con retroalimentación razonada." },
] as const;

/**
 * Columna de marca de las pantallas de acceso (solo escritorio): explica qué hace
 * GenOVA con el propio modelo 5E, que es lo que el docente va a obtener.
 */
export function AuthBrandPanel() {
  return (
    <aside className="relative hidden overflow-hidden bg-brand-surface text-brand-surface-foreground lg:flex lg:flex-col lg:justify-between lg:px-12 lg:py-10 xl:px-16">
      <p className="font-display text-2xl font-semibold tracking-tight">GenOVA</p>
      <div className="max-w-lg">
        <h2 className="font-display text-4xl leading-[1.1] font-semibold tracking-tight xl:text-[2.75rem]">
          Describe un tema. Recibe un OVA completo para tu curso.
        </h2>
        <ol className="mt-10 space-y-5">
          {PHASES.map((phase, index) => (
            <li key={phase.name} className="grid grid-cols-[2rem_1fr] gap-x-3">
              <span
                aria-hidden="true"
                className="flex size-7 items-center justify-center rounded-full border border-brand-surface-foreground/30 text-xs font-semibold tabular-nums"
              >
                {index + 1}
              </span>
              <p className="text-sm leading-snug">
                <span className="font-semibold">{phase.name}.</span>{" "}
                <span className="text-brand-surface-foreground/75">{phase.text}</span>
              </p>
            </li>
          ))}
        </ol>
      </div>
      <p className="text-xs text-brand-surface-foreground/65">
        Universidad Privada Antenor Orrego · Exporta a SCORM 1.2 para tu aula virtual
      </p>
    </aside>
  );
}
