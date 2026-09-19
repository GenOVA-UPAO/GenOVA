export const adminKeys = {
  usersAll: ["admin", "users"] as const,
  users: (page: number) => [...adminKeys.usersAll, page] as const,
  roles: ["admin", "roles"] as const,
  registrationMode: ["admin", "registration-mode"] as const,
};
