import type { Routes } from "@angular/router";

import { authGuard, guestGuard } from "../core/auth/auth.guard";

export const routes: Routes = [
  // ── Public / Auth routes ──────────────────────────────────────────────
  {
    path: "login",
    title: "Iniciar sesión",
    canActivate: [guestGuard],
    loadComponent: () => import("../features/auth/pages/login-page").then((m) => m.LoginPage),
  },
  {
    path: "register",
    title: "Crear cuenta",
    canActivate: [guestGuard],
    loadComponent: () => import("../features/auth/pages/register-page").then((m) => m.RegisterPage),
  },
  {
    path: "forgot-password",
    title: "Recuperar contraseña",
    canActivate: [guestGuard],
    loadComponent: () =>
      import("../features/auth/pages/forgot-password-page").then((m) => m.ForgotPasswordPage),
  },
  {
    path: "reset-password",
    title: "Restablecer contraseña",
    canActivate: [guestGuard],
    loadComponent: () =>
      import("../features/auth/pages/reset-password-page").then((m) => m.ResetPasswordPage),
  },
  {
    path: "verify-email",
    title: "Verificar correo",
    loadComponent: () =>
      import("../features/auth/pages/verify-email-page").then((m) => m.VerifyEmailPage),
  },

  // ── Legacy URL redirects (public) ─────────────────────────────────────
  // Spanish auth URLs from the React app — emails already sent link here.
  {
    path: "recuperar-contrasena",
    redirectTo: "/forgot-password",
    pathMatch: "full",
  },
  {
    path: "verificar-correo",
    redirectTo: "/verify-email",
    pathMatch: "full",
  },
  {
    path: "metodologia/explore",
    redirectTo: "/explore",
    pathMatch: "full",
  },
  {
    path: "metodologia/engage/:id",
    redirectTo: "/engage/:id",
  },

  // ── Protected routes (inside AppLayout shell) ─────────────────────────
  {
    path: "",
    canActivate: [authGuard],
    loadComponent: () => import("./layout/shells/app-layout").then((m) => m.AppLayout),
    children: [
      { path: "", redirectTo: "dashboard", pathMatch: "full" },
      {
        path: "dashboard",
        title: "Dashboard",
        loadComponent: () =>
          import("../features/ova-library/pages/dashboard-page").then((m) => m.DashboardPage),
      },
      {
        path: "mis-ovas",
        title: "Biblioteca de OVAs",
        loadComponent: () =>
          import("../features/ova-library/pages/mis-ovas-page").then((m) => m.MisOvasPage),
      },
      {
        path: "papelera",
        title: "Papelera",
        loadComponent: () =>
          import("../features/ova-library/pages/papelera-page").then((m) => m.PapeleraPage),
      },
      {
        path: "crear-ova",
        redirectTo: "crear",
        pathMatch: "full",
      },
      {
        path: "crear",
        title: "Crear OVA",
        data: { fullBleed: true },
        loadComponent: () =>
          import("../features/ova-workspace/pages/ova-workspace-page.component").then(
            (m) => m.OvaWorkspacePageComponent,
          ),
      },
      {
        path: "ova/:id/workspace",
        redirectTo: "workspace/:id",
      },
      {
        // React URL for in-flight generation jobs → query-param form.
        path: "ova/job/:jobId/workspace",
        redirectTo: ({ params }) => `/crear?jobId=${params["jobId"]}`,
      },
      {
        path: "workspace/:id",
        title: "Editor de OVA",
        data: { fullBleed: true },
        loadComponent: () =>
          import("../features/ova-workspace/pages/ova-workspace-page.component").then(
            (m) => m.OvaWorkspacePageComponent,
          ),
      },
      {
        path: "profile",
        title: "Mi perfil",
        loadComponent: () =>
          import("../features/profile/pages/profile-page.component").then(
            (m) => m.ProfilePageComponent,
          ),
      },
      {
        path: "vinculacion",
        title: "Vincular cuentas",
        loadComponent: () =>
          import("../features/profile/pages/user-links-page.component").then(
            (m) => m.UserLinksPageComponent,
          ),
      },
      {
        path: "analytics",
        title: "Analítica",
        loadComponent: () =>
          import("../features/analytics/pages/analytics-page.component").then(
            (m) => m.AnalyticsPageComponent,
          ),
      },
      {
        path: "modelos",
        redirectTo: "models",
        pathMatch: "full",
      },
      {
        path: "fallback",
        redirectTo: "models",
        pathMatch: "full",
      },
      {
        path: "models",
        title: "Modelos de IA",
        loadComponent: () =>
          import("../features/llm-settings/pages/models-page.component").then(
            (m) => m.ModelsPageComponent,
          ),
      },
      // ── Admin routes ───────────────────────────────────────────────────
      {
        path: "admin",
        loadChildren: () => import("../features/admin/admin.routes").then((m) => m.adminRoutes),
      },
    ],
  },

  // ── Playground público de fases 5E ────────────────────────────────────
  {
    path: "explore",
    title: "Explora",
    loadComponent: () =>
      import("../features/ova-workspace/pages/explore-page.component").then(
        (m) => m.ExplorePageComponent,
      ),
  },
  {
    path: "engage/:id",
    title: "Engage",
    loadComponent: () =>
      import("../features/ova-workspace/pages/engage-page.component").then(
        (m) => m.EngagePageComponent,
      ),
  },

  // ── Fallback ──────────────────────────────────────────────────────────
  {
    path: "**",
    title: "Página no encontrada",
    loadComponent: () => import("../core/components/not-found-page").then((m) => m.NotFoundPage),
  },
];
