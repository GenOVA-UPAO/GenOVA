import i18n from "i18next";
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

const guest = (path: string, titleKey: string, lazy: RouteObject["lazy"]): RouteObject => ({
  path,
  loader: requireGuest,
  handle: { get title() { return i18n.t(titleKey); } } satisfies RouteHandle,
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
      guest("/login", "shell:iniciar_sesion", page(pageLoaders.login, "LoginPage")),
      guest("/register", "shell:crear_cuenta", page(pageLoaders.register, "RegisterPage")),
      guest(
        "/forgot-password",
        "shell:recuperar_contrasena",
        page(pageLoaders.forgotPassword, "ForgotPasswordPage"),
      ),
      guest(
        "/reset-password",
        "shell:restablecer_contrasena",
        page(pageLoaders.resetPassword, "ResetPasswordPage"),
      ),
      {
        path: "/verify-email",
        handle: { get title() { return i18n.t("shell:verificar_correo"); } } satisfies RouteHandle,
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
            handle: { get title() { return i18n.t("shell:dashboard"); } },
            loader: dashboardLoader,
            lazy: page(pageLoaders.dashboard, "DashboardPage"),
          },
          {
            path: "mis-ovas",
            handle: { get title() { return i18n.t("shell:biblioteca_de_ovas"); } },
            lazy: page(pageLoaders.misOvas, "MisOvasPage"),
          },
          {
            path: "papelera",
            handle: { get title() { return i18n.t("shell:papelera"); } },
            lazy: page(pageLoaders.papelera, "PapeleraPage"),
          },
          redirectRoute("crear-ova", "/crear"),
          { path: "crear", handle: { get title() { return i18n.t("shell:crear_ova"); }, fullBleed: true }, lazy: workspace },
          redirectRoute("ova/:id/workspace", ({ params }) => `/workspace/${String(params.id)}`),
          redirectRoute(
            "ova/job/:jobId/workspace",
            ({ params }) => `/crear?jobId=${String(params.jobId)}`,
          ),
          {
            path: "workspace/:id",
            handle: { get title() { return i18n.t("shell:editor_de_ova"); }, fullBleed: true },
            lazy: workspace,
          },
          {
            path: "profile",
            handle: { get title() { return i18n.t("shell:mi_perfil"); } },
            lazy: page(pageLoaders.profile, "ProfilePage"),
          },
          {
            path: "analytics",
            handle: { get title() { return i18n.t("shell:analitica"); } },
            lazy: page(pageLoaders.analytics, "AnalyticsPage"),
          },
          redirectRoute("modelos", "/models"),
          redirectRoute("fallback", "/models"),
          {
            path: "models",
            handle: { get title() { return i18n.t("shell:modelos_de_ia"); } },
            lazy: page(pageLoaders.models, "ModelsPage"),
          },
          {
            path: "admin",
            loader: requireAdmin,
            handle: { get title() { return i18n.t("shell:usuarios"); } },
            lazy: page(pageLoaders.adminUsers, "AdminUsersPage"),
          },
          redirectRoute("admin/users", "/admin"),
          {
            path: "admin/roles",
            loader: requireAdmin,
            handle: { get title() { return i18n.t("shell:gestion_de_roles"); } },
            lazy: page(pageLoaders.adminRoles, "AdminRolesPage"),
          },
          {
            path: "admin/lti",
            loader: requireAdmin,
            handle: { title: "Integración LTI" },
            lazy: page(pageLoaders.adminLti, "AdminLtiPage"),
          },
          redirectRoute("admin/platform", "/models"),
        ],
      },
      {
        path: "/explore",
        loader: requireAuth,
        handle: { get title() { return i18n.t("shell:fase_explore"); } } satisfies RouteHandle,
        lazy: page(pageLoaders.explore, "ExplorePage"),
      },
      {
        path: "/engage/:id",
        loader: requireAuth,
        handle: { get title() { return i18n.t("shell:fase_engage"); } } satisfies RouteHandle,
        lazy: page(pageLoaders.engage, "EngagePage"),
      },
      {
        path: "*",
        handle: { get title() { return i18n.t("shell:pagina_no_encontrada"); } } satisfies RouteHandle,
        lazy: page(pageLoaders.notFound, "NotFoundPage"),
      },
    ],
  },
];

export const router = createBrowserRouter(routes);
