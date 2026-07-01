import type { Routes } from "@angular/router";
import { authGuard } from "../auth/services/auth.guard";

export const adminRoutes: Routes = [
  {
    path: "",
    canActivate: [authGuard],
    loadComponent: () => import("./pages/admin-users-page").then((m) => m.AdminUsersPage),
  },
  {
    path: "roles",
    canActivate: [authGuard],
    loadComponent: () => import("./pages/admin-roles-page").then((m) => m.AdminRolesPage),
  },
];
