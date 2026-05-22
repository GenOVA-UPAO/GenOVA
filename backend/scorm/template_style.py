def build_styles_css() -> str:
    return """:root {
  --bg: #f8fafc;
  --surface: #ffffff;
  --text: #0f172a;
  --muted: #475569;
  --primary: #1d4ed8;
  --border: #cbd5e1;
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
}

.res-link.active {
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
  padding: 10px 14px;
  background: var(--primary);
  color: #fff;
  cursor: pointer;
}

button:hover {
  opacity: 0.95;
}

#scorm-status {
  color: var(--muted);
}
"""
