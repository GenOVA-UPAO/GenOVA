const FORBIDDEN_CDN = [
  'jsdelivr',
  'cdnjs',
  'unpkg.com',
  'jquery.min.js',
  'bootstrap.min',
  'googleapis.com/ajax',
  'maxcdn',
]
const SCORM_TOKENS = ['_scormInit', '_scormComplete', 'cmi.core.lesson_status']

export interface HtmlQuality {
  cdn_ok: boolean
  scorm_ok: boolean
  min_length_ok: boolean
  char_count: number
}

/** Run client-side quality checks on generated HTML. */
export function checkHtmlQuality(html: string): HtmlQuality {
  if (!html) return { cdn_ok: false, scorm_ok: false, min_length_ok: false, char_count: 0 }
  const low = html.toLowerCase()
  return {
    cdn_ok: !FORBIDDEN_CDN.some((pat) => low.includes(pat)),
    scorm_ok: SCORM_TOKENS.every((tok) => html.includes(tok)),
    min_length_ok: html.length >= 1000,
    char_count: html.length,
  }
}
