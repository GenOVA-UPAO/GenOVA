/** Bloque de código HTML crudo de la vista "Código" de la vista previa. */
export function HtmlCodeView({ content }: Readonly<{ content: string }>) {
  return (
    <div>
      <div className="flex items-center justify-between bg-slate-800 px-3 py-2">
        <span className="text-[10px] font-mono font-medium uppercase tracking-wider text-slate-400">HTML</span>
        <span className="text-[10px] text-slate-500">{content.length} chars</span>
      </div>
      <pre className="max-h-[480px] overflow-auto bg-slate-900 p-4 text-[11px] leading-relaxed text-slate-200">
        <code>{content}</code>
      </pre>
    </div>
  );
}
