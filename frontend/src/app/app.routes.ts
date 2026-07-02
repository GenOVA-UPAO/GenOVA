import type { Routes } from "@angular/router";
import { authGuard, guestGuard } from "../core/auth/auth.guard";

export const routes: Routes = [
  // ── Public / Auth routes ──────────────────────────────────────────────
  {
    path: "login",
    canActivate: [guestGuard],
    loadComponent: () => import("../features/auth/pages/login-page").then((m) => m.LoginPage),
  },
  {
    path: "register",
    canActivate: [guestGuard],
    loadComponent: () => import("../features/auth/pages/register-page").then((m) => m.RegisterPage),
  },
  {
    path: "forgot-password",
    canActivate: [guestGuard],
    loadComponent: () =>
      import("../features/auth/pages/forgot-password-page").then((m) => m.ForgotPasswordPage),
  },
  {
    path: "reset-password",
    canActivate: [guestGuard],
    loadComponent: () =>
      import("../features/auth/pages/reset-password-page").then((m) => m.ResetPasswordPage),
  },
  {
    path: "verify-email",
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
        loadComponent: () =>
          import("../features/ova-library/pages/dashboard-page").then((m) => m.DashboardPage),
      },
      {
        path: "mis-ovas",
        loadComponent: () =>
          import("../features/ova-library/pages/mis-ovas-page").then((m) => m.MisOvasPage),
      },
      {
        path: "papelera",
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
        loadComponent: () =>
          import("../features/ova-workspace/pages/ova-workspace-page.component").then(
            (m) => m.OvaWorkspacePageComponent,
          ),
      },
      {
        path: "profile",
        loadComponent: () =>
          import("../features/profile/pages/profile-page.component").then(
            (m) => m.ProfilePageComponent,
          ),
      },
      {
        path: "vinculacion",
        loadComponent: () =>
          import("../features/profile/pages/user-links-page.component").then(
            (m) => m.UserLinksPageComponent,
          ),
      },
      {
        path: "analytics",
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
    loadComponent: () =>
      import("../features/ova-workspace/pages/explore-page.component").then(
        (m) => m.ExplorePageComponent,
      ),
  },
  {
    path: "engage/:id",
    loadComponent: () =>
      import("../features/ova-workspace/pages/engage-page.component").then(
        (m) => m.EngagePageComponent,
      ),
  },

  // ── Fallback ──────────────────────────────────────────────────────────
  {
    path: "**",
    loadComponent: () => import("../core/components/not-found-page").then((m) => m.NotFoundPage),
  },
];
