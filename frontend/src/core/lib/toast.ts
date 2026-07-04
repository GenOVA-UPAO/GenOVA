function show(message: string, kind: "info" | "success" | "error"): void {
  if (typeof globalThis.document === "undefined") return;

  const el = globalThis.document.createElement("div");
  el.setAttribute("role", "status");
  el.textContent = message;
  el.className = cnToast(kind);
  globalThis.document.body.appendChild(el);

  globalThis.requestAnimationFrame(() => {
    el.style.opacity = "1";
    el.style.transform = "translateY(0)";
  });

  globalThis.setTimeout(() => {
    el.style.opacity = "0";
    el.style.transform = "translateY(0.5rem)";
    globalThis.setTimeout(() => {
      el.remove();
    }, 200);
  }, 3200);
}

function cnToast(kind: "info" | "success" | "error"): string {
  const base =
    "fixed bottom-4 right-4 z-[9999] max-w-sm rounded-lg border px-4 py-3 text-sm shadow-lg transition-all duration-200 opacity-0 translate-y-2";
  if (kind === "success") {
    return `${base} border-emerald-500/30 bg-emerald-950 text-emerald-50`;
  }
  if (kind === "error") {
    return `${base} border-destructive/40 bg-destructive text-destructive-foreground`;
  }
  return `${base} border-border bg-card text-foreground`;
}

export const toast = Object.assign(
  (message: string) => {
    show(message, "info");
  },
  {
    success: (message: string) => {
      show(message, "success");
    },
    error: (message: string) => {
      show(message, "error");
    },
  },
);
