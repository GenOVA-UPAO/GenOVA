import { useQuery } from "@tanstack/react-query";

import { fetchUsers } from "../api/admin-users.api";
import { adminKeys } from "./query-keys";

export function useAdminUsers(page: number) {
  return useQuery({
    queryKey: adminKeys.users(page),
    queryFn: () => fetchUsers(page),
  });
}
