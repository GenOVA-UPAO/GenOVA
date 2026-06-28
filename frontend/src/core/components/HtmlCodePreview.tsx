import { useState } from 'react'
import { Button } from '@/core/components/ui/button'
import { HtmlPreviewFrame } from './HtmlPreviewFrame'

function looksLikeHtml(content: string | null | undefined): boolean {
  if (!content) return false
  return content.trimStart().startsWith('<')
}

function ViewToggle({
  view,
  onSwitch,
  charCount,
}: {
  view: string
  onSwitch: (v: string) => void
  charCount: number
}) {
  return (
    <div className="flex items-center gap-1.5">
      <Button
        type="button"
        size="sm"
        variant={view === 'preview' ? 'default' : 'secondary'}
        onClick={() => onSwitch('preview')}
      >
        Vista previa
      </Button>
      <Button
        type="button"
        size="sm"
        variant={view === 'code' ? 'default' : 'secondary'}
        onClick={() => onSwitch('code')}
      >
        Código
      </Button>
      {view === 'code' ? (
        <span className="ml-auto text-[10px] text-muted-foreground">
          {charCount.toLocaleString()} chars
        </span>
      ) : null}
    </div>
  )
}

interface HtmlCodePreviewProps {
  htmlContent?: string | null
  defaultView?: string
  height?: string
}

export function HtmlCodePreview({
  htmlContent,
  defaultView = 'preview',
  height = '60vh',
}: HtmlCodePreviewProps) {
  const [view, setView] = useState(defaultView)

  if (!htmlContent) return null

  if (!looksLikeHtml(htmlContent)) {
    return (
      <p className="text-sm text-foreground whitespace-pre-wrap">
        {htmlContent}
      </p>
    )
  }

  return (
    <div className="space-y-2">
      <ViewToggle
        view={view}
        onSwitch={setView}
        charCount={htmlContent.length}
      />

      <div className="rounded-xl border border-border overflow-hidden shadow-sm">
        <HtmlPreviewFrame
          html={htmlContent}
          height={height}
          className={`w-full border-0 block${view === 'preview' ? '' : ' hidden'}`}
        />
        <div className={view === 'code' ? '' : 'hidden'}>
          <div className="flex items-center bg-slate-800 px-3 py-2">
            <span className="text-[10px] font-mono font-medium uppercase tracking-wider text-slate-400">
              HTML
            </span>
          </div>
          <pre className="max-h-[420px] overflow-auto bg-slate-900 p-4 text-[11px] leading-relaxed text-slate-200">
            <code>{htmlContent}</code>
          </pre>
        </div>
      </div>
    </div>
  )
}
