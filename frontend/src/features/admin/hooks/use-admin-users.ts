import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { fetchUsers } from "../api/admin-users.api";
import type { UsersListParams } from "../lib/types";
import { adminKeys } from "./query-keys";

export function useAdminUsers(params: UsersListParams) {
  return useQuery({
    queryKey: adminKeys.users(params),
    queryFn: () => fetchUsers(params),
    placeholderData: keepPreviousData,
  });
}
