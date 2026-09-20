import { createBrowserRouter, redirect, type RouteObject } from "react-router";

import { requireAdmin, requireAuth, requireGuest } from "@/core/auth/guards";

import { AppSplash } from "./app-splash";
import { pageLoaders } from "./pages";
import { RootLayout } from "./root-layout";
import { RouteError } from "./route-error";
import { dashboardLoader } from "./route-prefetch";

/** Route metadata: page title (suffixed with " · GenOVA") and full-bleed shell. */
export interface RouteHandle {
  title?: string;
  fullBleed?: boolean;
}

type Loaded = Promise<object>;
/** Lazy page: the chunk is fetched on navigation, keeping the entry bundle small. */
const page = (load: () => Loaded, name: string) => async () => ({
  Component: ((await load()) as Record<string, React.ComponentType>)[name],
});

const guest = (path: string, title: string, lazy: RouteObject["lazy"]): RouteObject => ({
  path,
  loader: requireGuest,
  handle: { title } satisfies RouteHandle,
  lazy,
});

const workspace = page(pageLoaders.workspace, "OvaWorkspacePage");

export const routes: RouteObject[] = [
  {
    Component: RootLayout,
    HydrateFallback: AppSplash,
    errorElement: <RouteError />,
    children: [
      guest("/login", "Iniciar sesión", page(pageLoaders.login, "LoginPage")),
      guest("/register", "Crear cuenta", page(pageLoaders.register, "RegisterPage")),
      guest(
        "/forgot-password",
        "Recuperar contraseña",
        page(pageLoaders.forgotPassword, "ForgotPasswordPage"),
      ),
      guest(
        "/reset-password",
        "Restablecer contraseña",
        page(pageLoaders.resetPassword, "ResetPasswordPage"),
      ),
      {
        path: "/verify-email",
        handle: { title: "Verificar correo" } satisfies RouteHandle,
        lazy: page(pageLoaders.verifyEmail, "VerifyEmailPage"),
      },
      // Legacy Spanish URLs (emails already sent link here).
      { path: "/recuperar-contrasena", loader: () => redirect("/forgot-password") },
      {
        path: "/verificar-correo",
        loader: ({ request }) => redirect(`/verify-email${new URL(request.url).search}`),
      },
      { path: "/metodologia/explore", loader: () => redirect("/explore") },
      {
        path: "/metodologia/engage/:id",
        loader: ({ params }) => redirect(`/engage/${String(params.id)}`),
      },
      {
        path: "/",
        loader: requireAuth,
        lazy: page(pageLoaders.appLayout, "AppLayout"),
        children: [
          { index: true, loader: () => redirect("/dashboard") },
          {
            path: "dashboard",
            handle: { title: "Dashboard" },
            loader: dashboardLoader,
            lazy: page(pageLoaders.dashboard, "DashboardPage"),
          },
          {
            path: "mis-ovas",
            handle: { title: "Biblioteca de OVAs" },
            lazy: page(pageLoaders.misOvas, "MisOvasPage"),
          },
          {
            path: "papelera",
            handle: { title: "Papelera" },
            lazy: page(pageLoaders.papelera, "PapeleraPage"),
          },
          { path: "crear-ova", loader: () => redirect("/crear") },
          { path: "crear", handle: { title: "Crear OVA", fullBleed: true }, lazy: workspace },
          {
            path: "ova/:id/workspace",
            loader: ({ params }) => redirect(`/workspace/${String(params.id)}`),
          },
          {
            path: "ova/job/:jobId/workspace",
            loader: ({ params }) => redirect(`/crear?jobId=${String(params.jobId)}`),
          },
          {
            path: "workspace/:id",
            handle: { title: "Editor de OVA", fullBleed: true },
            lazy: workspace,
          },
          {
            path: "profile",
            handle: { title: "Mi perfil" },
            lazy: page(pageLoaders.profile, "ProfilePage"),
          },
          {
            path: "analytics",
            handle: { title: "Analítica" },
            lazy: page(pageLoaders.analytics, "AnalyticsPage"),
          },
          { path: "modelos", loader: () => redirect("/models") },
          { path: "fallback", loader: () => redirect("/models") },
          {
            path: "models",
            handle: { title: "Modelos de IA" },
            lazy: page(pageLoaders.models, "ModelsPage"),
          },
          {
            path: "admin",
            loader: requireAdmin,
            handle: { title: "Usuarios" },
            lazy: page(pageLoaders.adminUsers, "AdminUsersPage"),
          },
          { path: "admin/users", loader: () => redirect("/admin") },
          {
            path: "admin/roles",
            loader: requireAdmin,
            handle: { title: "Gestión de roles" },
            lazy: page(pageLoaders.adminRoles, "AdminRolesPage"),
          },
          { path: "admin/platform", loader: () => redirect("/models") },
        ],
      },
      {
        path: "/explore",
        loader: requireAuth,
        handle: { title: "Fase Explore" } satisfies RouteHandle,
        lazy: page(pageLoaders.explore, "ExplorePage"),
      },
      {
        path: "/engage/:id",
        loader: requireAuth,
        handle: { title: "Fase Engage" } satisfies RouteHandle,
        lazy: page(pageLoaders.engage, "EngagePage"),
      },
      {
        path: "*",
        handle: { title: "Página no encontrada" } satisfies RouteHandle,
        lazy: page(pageLoaders.notFound, "NotFoundPage"),
      },
    ],
  },
];

export const router = createBrowserRouter(routes);
