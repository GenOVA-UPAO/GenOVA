import type { Routes } from "@angular/router";

import { adminGuard, authGuard } from "@/core/auth/auth.guard";

export const adminRoutes: Routes = [
  {
    path: "",
    canActivate: [authGuard, adminGuard],
    loadComponent: () =>
      import("./pages/admin-users-page.component").then((m) => m.AdminUsersPageComponent),
  },
  {
    path: "roles",
    canActivate: [authGuard, adminGuard],
    loadComponent: () =>
      import("./pages/admin-roles-page.component").then((m) => m.AdminRolesPageComponent),
  },
  {
    path: "platform",
    redirectTo: "/models",
    pathMatch: "full",
  },
];
