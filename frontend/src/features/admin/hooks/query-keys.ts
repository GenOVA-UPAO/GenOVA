import { ALL_ROLE_FILTER, type UsersListParams } from "../lib/types";

export const adminKeys = {
  usersAll: ["admin", "users"] as const,
  users: ({ page, search = "", roleId = ALL_ROLE_FILTER }: UsersListParams) =>
    [...adminKeys.usersAll, { page, search, roleId }] as const,
  roles: ["admin", "roles"] as const,
  registrationMode: ["admin", "registration-mode"] as const,
  ltiTool: ["admin", "lti", "tool"] as const,
  ltiPlatforms: ["admin", "lti", "platforms"] as const,
};
