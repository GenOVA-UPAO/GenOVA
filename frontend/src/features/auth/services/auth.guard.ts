import { inject } from "@angular/core";
import { type CanActivateFn, Router } from "@angular/router";
import { AuthService } from "./auth.service";

/**
 * Route guard — equivalent to React's AuthGateLoader.
 * Redirects to /login if no authenticated user is found after a /me revalidation.
 */
export const authGuard: CanActivateFn = async (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  // Already authenticated (cached signal) → allow immediately.
  if (auth.isAuthenticated()) return true;

  // Try to revalidate against the server.
  const user = await auth.revalidate();

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

  if (!auth.isAuthenticated()) {
    await auth.revalidate();
  }

  if (auth.isAuthenticated()) {
    return inject(Router).createUrlTree(["/dashboard"]);
  }

  return true;
};
