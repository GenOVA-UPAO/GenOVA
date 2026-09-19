import { useEffect, useRef } from "react";

interface HtmlPreviewFrameProps {
  html?: string;
  /** Altura CSS del iframe; `null` para que la controle `className`. */
  height?: string | null;
  className?: string;
  title?: string;
}

/**
 * Previsualiza HTML generado en un iframe aislado (`sandbox="allow-scripts"`,
 * sin same-origin) a partir de un Blob URL que se revoca al cambiar o desmontar.
 */
export function HtmlPreviewFrame({
  html = "",
  height = "60vh",
  className = "block w-full border-0",
  title = "Vista previa del recurso",
}: Readonly<HtmlPreviewFrameProps>) {
  const frameRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return undefined;
    if (html === "") {
      frame.src = "about:blank";
      return undefined;
    }
    // charset explícito: sin él los acentos del contenido salen corruptos.
    const url = URL.createObjectURL(new Blob([html], { type: "text/html;charset=utf-8" }));
    frame.src = url;
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [html]);

  return (
    <iframe
      ref={frameRef}
      title={title}
      className={className}
      style={height === null ? undefined : { height }}
      sandbox="allow-scripts"
    />
  );
}
