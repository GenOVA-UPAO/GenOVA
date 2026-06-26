/**
 * Dashboard del estudiante — muestra OVAs compartidos y contenido explorable.
 */
export function DashboardPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Mi Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Bienvenido. Aquí puedes ver los OVAs que tus profesores han compartido contigo.
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">OVAs Compartidos</h2>
        <div className="rounded-xl border bg-muted/30 p-8 text-center text-sm text-muted-foreground">
          Aún no tienes OVAs compartidos. Cuando un profesor te vincule, sus OVAs aparecerán aquí.
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Explorar</h2>
        <div className="rounded-xl border bg-muted/30 p-8 text-center text-sm text-muted-foreground">
          Próximamente: exploración de contenido educativo público.
        </div>
      </section>
    </div>
  )
}
