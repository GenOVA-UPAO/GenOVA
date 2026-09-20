export interface Role {
  id: string;
  name?: string;
  description?: string;
  user_count?: number;
  permissions?: string[];
  [key: string]: unknown;
}

export interface AdminUser {
  id: string;
  full_name?: string | null;
  email: string;
  is_active?: boolean | null;
  role?: { id: string; name: string } | null;
  phone_number?: string | null;
  university_id?: number | string | null;
  locked_until?: string | null;
  gender?: string | null;
  [key: string]: unknown;
}

export interface UsersPage {
  users: AdminUser[];
  total_pages: number;
  total_items: number;
}

export const ALL_ROLE_FILTER = "all";

export interface UsersListParams {
  page: number;
  search?: string;
  roleId?: string;
}

export interface UserEditPayload {
  full_name: string;
  email: string;
  university_id: number | null;
  gender: string | null;
  phone_number: string | null;
}

export interface UsersHandlers {
  handleRoleChange: (userId: string, roleId: string) => void;
  handleToggleStatus: (userId: string, isActive: boolean) => void;
  handleUnlockUser: (userId: string) => void;
  handleSendResetEmail: (userId: string) => void;
  openEdit: (user: AdminUser) => void;
}
