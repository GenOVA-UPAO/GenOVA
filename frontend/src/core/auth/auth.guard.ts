import { inject } from "@angular/core";
import { type CanActivateFn, Router } from "@angular/router";

import { AuthService } from "./auth.service";

/**
 * Una navegación puede encadenar guards (authGuard → redirect a /login →
 * guestGuard); dentro de esta ventana se reutiliza el resultado de /auth/me
 * en vez de repetir la petición.
 */
const REVALIDATE_MAX_AGE_MS = 3000;

/**
 * Route guard — equivalent to React's AuthGateLoader.
 * Redirects to /login if no authenticated user is found after a /me revalidation.
 */
export const authGuard: CanActivateFn = async (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  // Siempre revalidar (con ventana corta): si solo confiamos en sessionStorage,
  // un cambio de permisos/rol en admin no se refleja hasta cerrar sesión.
  const user = await auth.revalidate(REVALIDATE_MAX_AGE_MS);

  if (user) return true;

  return router.createUrlTree(["/login"], {
    queryParams: { returnUrl: state.url },
  });
};

/**
 * Guard that prevents authenticated users from accessing auth pages (login, register).
 * Redirects to /dashboard if already logged in.
 */
export const guestGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  // BU-004: inject() tras un await está fuera del contexto de inyección (NG0203)
  // — capturar el Router ANTES de la primera espera.
  const router = inject(Router);

  if (!auth.isAuthenticated()) {
    await auth.revalidate(REVALIDATE_MAX_AGE_MS);
  }

  if (auth.isAuthenticated()) {
    return router.createUrlTree(["/dashboard"]);
  }

  return true;
};

/**
 * Admin-only guard — equivalent to React's AdminRoute.
 * Requires role === 'administrador'; redirects others to /dashboard.
 */
export const adminGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isAuthenticated()) {
    await auth.revalidate(REVALIDATE_MAX_AGE_MS);
  }

  if (!auth.isAuthenticated()) {
    return router.createUrlTree(["/login"]);
  }

  if (auth.user()?.role === "administrador") return true;

  return router.createUrlTree(["/dashboard"]);
};
