/**
 * Single source of lazy page imports: the router uses them for code splitting
 * and nav links call `prefetchRoute` on hover/focus so the chunk is usually
 * already cached when the user clicks.
 */
export const pageLoaders = {
  login: () => import("@/features/auth/pages/login-page"),
  register: () => import("@/features/auth/pages/register-page"),
  forgotPassword: () => import("@/features/auth/pages/forgot-password-page"),
  resetPassword: () => import("@/features/auth/pages/reset-password-page"),
  verifyEmail: () => import("@/features/auth/pages/verify-email-page"),
  appLayout: () => import("./layout/app-layout"),
  dashboard: () => import("@/features/ova-library/pages/dashboard-page"),
  misOvas: () => import("@/features/ova-library/pages/mis-ovas-page"),
  papelera: () => import("@/features/ova-library/pages/papelera-page"),
  workspace: () => import("@/features/ova-workspace/pages/ova-workspace-page"),
  profile: () => import("@/features/profile/pages/profile-page"),
  analytics: () => import("@/features/analytics/pages/analytics-page"),
  models: () => import("@/features/llm-settings/pages/models-page"),
  adminUsers: () => import("@/features/admin/pages/admin-users-page"),
  adminRoles: () => import("@/features/admin/pages/admin-roles-page"),
  explore: () => import("@/features/ova-workspace/pages/explore-page"),
  engage: () => import("@/features/ova-workspace/pages/engage-page"),
  notFound: () => import("@/core/components/not-found-page"),
} as const;

const PATH_TO_PAGE: Partial<Record<string, keyof typeof pageLoaders>> = {
  "/dashboard": "dashboard",
  "/mis-ovas": "misOvas",
  "/papelera": "papelera",
  "/crear": "workspace",
  "/profile": "profile",
  "/analytics": "analytics",
  "/models": "models",
  "/admin": "adminUsers",
  "/admin/roles": "adminRoles",
};

export function prefetchRoute(path: string): void {
  const key = PATH_TO_PAGE[path.split("?")[0]];
  if (key) void pageLoaders[key]().catch(() => undefined);
}

/**
 * Descarga en segundo plano las páginas indicadas, una a una y cuando el
 * navegador está libre, para que abrirlas por primera vez sea inmediato (la
 * precarga al pasar el ratón llega justo antes del clic). Devuelve cómo
 * cancelarlo.
 */
export function prefetchRoutesWhenIdle(paths: readonly string[]): () => void {
  let cancelled = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const queue = [...paths];
  const next = () => {
    const path = queue.shift();
    if (cancelled || path === undefined) return;
    prefetchRoute(path);
    timer = setTimeout(next, 300);
  };
  timer = setTimeout(next, 2000);
  return () => {
    cancelled = true;
    clearTimeout(timer);
  };
}
