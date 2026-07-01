import type { Routes } from "@angular/router";
import { authGuard, guestGuard } from "../features/auth/services/auth.guard";

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

  // ── Protected routes (inside AppLayout shell) ─────────────────────────
  {
    path: "",
    canActivate: [authGuard],
    loadComponent: () => import("../core/layouts/shells/app-layout").then((m) => m.AppLayout),
    children: [
      { path: "", redirectTo: "dashboard", pathMatch: "full" },
      {
        path: "dashboard",
        loadComponent: () =>
          import("../features/ova_library/pages/dashboard-page").then((m) => m.DashboardPage),
      },
      {
        path: "mis-ovas",
        loadComponent: () =>
          import("../features/ova_library/pages/mis-ovas-page").then((m) => m.MisOvasPage),
      },
      {
        path: "papelera",
        loadComponent: () =>
          import("../features/ova_library/pages/papelera-page").then((m) => m.PapeleraPage),
      },
      {
        path: "crear",
        loadComponent: () =>
          import("../features/ova_workspace/pages/ova-workspace-page").then(
            (m) => m.OvaWorkspacePage,
          ),
      },
      {
        path: "workspace/:id",
        loadComponent: () =>
          import("../features/ova_workspace/pages/ova-workspace-page").then(
            (m) => m.OvaWorkspacePage,
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
        path: "analytics",
        loadComponent: () =>
          import("../features/analytics/pages/analytics-page.component").then(
            (m) => m.AnalyticsPageComponent,
          ),
      },
      {
        path: "models",
        loadComponent: () =>
          import("../features/ova_workspace/pages/models-page").then((m) => m.ModelsPage),
      },
      // ── Admin routes ───────────────────────────────────────────────────
      {
        path: "admin",
        loadChildren: () => import("../features/admin/admin.routes").then((m) => m.adminRoutes),
      },
    ],
  },

  // ── Student / public OVA viewer ───────────────────────────────────────
  {
    path: "explore",
    loadComponent: () =>
      import("../features/student/pages/explore-page.component").then(
        (m) => m.ExplorePageComponent,
      ),
  },
  {
    path: "engage/:id",
    loadComponent: () =>
      import("../features/student/pages/engage-page.component").then((m) => m.EngagePageComponent),
  },

  // ── Fallback ──────────────────────────────────────────────────────────
  {
    path: "**",
    loadComponent: () => import("../core/components/not-found-page").then((m) => m.NotFoundPage),
  },
];
