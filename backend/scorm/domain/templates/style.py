def build_styles_css() -> str:
    return """:root {
  --bg: #f8fafc;
  --surface: #ffffff;
  --text: #0f172a;
  --muted: #3f4d63;        /* >=7:1 sobre --bg (WCAG AA texto normal) */
  --primary: #1746c0;      /* >=4.5:1 como texto y >=4.5:1 como fondo con #fff */
  --border: #94a3b8;
  --focus: #0b3bbd;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: Arial, Helvetica, sans-serif;
  background: var(--bg);
  color: var(--text);
}

/* Visible para usuarios de teclado al tabular; oculto el resto del tiempo. */
.skip-link {
  position: absolute;
  left: -9999px;
  top: 0;
  background: var(--primary);
  color: #fff;
  padding: 10px 16px;
  border-radius: 0 0 8px 0;
  font-weight: 700;
  z-index: 100;
}

.skip-link:focus {
  left: 0;
}

/* Texto solo para lectores de pantalla. */
.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

/* Foco visible en cualquier elemento interactivo (WCAG 2.4.7 / 2.4.11). */
:focus-visible {
  outline: 3px solid var(--focus);
  outline-offset: 2px;
}

.container {
  max-width: 980px;
  margin: 0 auto;
  padding: 24px;
}

.nav {
  display: flex;
  gap: 12px;
  margin: 16px 0;
}

.nav a {
  color: var(--primary);
  text-decoration: none;
  font-weight: 700;
}

.card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 16px;
  margin-bottom: 16px;
}

.res-nav {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 16px 0;
}

.res-link {
  background: var(--surface);
  color: var(--primary);
  border: 1px solid var(--border);
  font-weight: 700;
  /* WCAG 2.5.8 (AA): objetivo táctil >= 24x24 CSS px. */
  min-height: 44px;
  min-width: 44px;
}

.res-link[aria-selected="true"] {
  background: var(--primary);
  color: #fff;
}

#res-frame {
  width: 100%;
  min-height: 70vh;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: #fff;
}

iframe {
  width: 100%;
  min-height: 320px;
  border: 1px solid var(--border);
  border-radius: 8px;
}

button {
  border: none;
  border-radius: 8px;
  padding: 12px 16px;
  min-height: 44px;
  background: var(--primary);
  color: #fff;
  cursor: pointer;
  font-weight: 700;
}

button:hover {
  opacity: 0.95;
}

#scorm-status {
  color: var(--muted);
}

@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
"""
