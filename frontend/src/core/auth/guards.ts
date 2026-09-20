import { type LoaderFunctionArgs, redirect } from "react-router";

import { authStore } from "./auth-store";

/**
 * Route guards as loaders: they run before the route renders, so a protected
 * page never flashes for a signed-out user. Chained guards within one
 * navigation reuse the /auth/me result (short revalidation window).
 */
const REVALIDATE_MAX_AGE_MS = 3000;

/**
 * Si el backend no responde (red caída, CORS, 5xx) la sesión se da por ausente:
 * la alternativa era que /login cayera en el error boundary y el usuario no
 * tuviera siquiera el formulario para reintentar.
 */
async function currentUser(maxAgeMs = REVALIDATE_MAX_AGE_MS) {
  try {
    return await authStore.revalidate(maxAgeMs);
  } catch (error) {
    console.warn("No se pudo verificar la sesión:", error);
    return null;
  }
}

/** Always revalidates (short window) so role/permission changes apply without re-login. */
export async function requireAuth({ request }: LoaderFunctionArgs) {
  const user = await currentUser();
  if (user) return null;
  const url = new URL(request.url);
  const returnUrl = url.pathname + url.search;
  return redirect(`/login?returnUrl=${encodeURIComponent(returnUrl)}`);
}

/** Signed-in users skip the auth pages. */
export async function requireGuest() {
  const user = authStore.getUser() ?? (await currentUser());
  return user ? redirect("/dashboard") : null;
}

/** Admin-only routes: others go back to the dashboard. */
export async function requireAdmin(args: LoaderFunctionArgs) {
  const denied = await requireAuth(args);
  if (denied) return denied;
  return authStore.getUser()?.role === "administrador" ? null : redirect("/dashboard");
}
