import { Fragment } from "react";
import {
  createBrowserRouter,
  type LoaderFunctionArgs,
  redirect,
  type RouteObject,
} from "react-router";

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

/** El loader siempre redirige; el Component vacío (Fragment) evita el aviso de ruta hoja sin elemento. */
const redirectRoute = (
  path: string,
  to: string | ((args: LoaderFunctionArgs) => string),
): RouteObject => ({
  path,
  Component: Fragment,
  loader: (args) => redirect(typeof to === "string" ? to : to(args)),
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
      redirectRoute("/recuperar-contrasena", "/forgot-password"),
      redirectRoute(
        "/verificar-correo",
        ({ request }) => `/verify-email${new URL(request.url).search}`,
      ),
      redirectRoute("/metodologia/explore", "/explore"),
      redirectRoute("/metodologia/engage/:id", ({ params }) => `/engage/${String(params.id)}`),
      {
        path: "/",
        loader: requireAuth,
        lazy: page(pageLoaders.appLayout, "AppLayout"),
        children: [
          { index: true, Component: Fragment, loader: () => redirect("/dashboard") },
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
          redirectRoute("crear-ova", "/crear"),
          { path: "crear", handle: { title: "Crear OVA", fullBleed: true }, lazy: workspace },
          redirectRoute("ova/:id/workspace", ({ params }) => `/workspace/${String(params.id)}`),
          redirectRoute(
            "ova/job/:jobId/workspace",
            ({ params }) => `/crear?jobId=${String(params.jobId)}`,
          ),
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
          redirectRoute("modelos", "/models"),
          redirectRoute("fallback", "/models"),
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
          redirectRoute("admin/users", "/admin"),
          {
            path: "admin/roles",
            loader: requireAdmin,
            handle: { title: "Gestión de roles" },
            lazy: page(pageLoaders.adminRoles, "AdminRolesPage"),
          },
          redirectRoute("admin/platform", "/models"),
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
