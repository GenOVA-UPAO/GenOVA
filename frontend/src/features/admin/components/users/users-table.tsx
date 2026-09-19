import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/core/components/ui/table";

import type { AdminUser, Role, UsersHandlers } from "../../lib/types";
import { UserRow } from "./user-row";

const HEAD_CLASS = "px-6 text-[11px] font-bold uppercase tracking-widest text-muted-foreground";

interface UsersTableProps {
  users: AdminUser[];
  roles: Role[];
  currentUserId: string;
  isCurrentUserAdmin: boolean;
  updatingUserId: string;
  searchQuery: string;
  handlers: UsersHandlers;
}

export function UsersTable({
  users,
  roles,
  currentUserId,
  isCurrentUserAdmin,
  updatingUserId,
  searchQuery,
  handlers,
}: Readonly<UsersTableProps>) {
  const emptyMessage =
    searchQuery !== "" ? `Sin resultados para "${searchQuery}"` : "No hay usuarios para mostrar";

  return (
    <Table className="min-w-[880px]">
      <TableHeader>
        <TableRow className="border-b border-border/50 bg-muted/20 hover:bg-muted/20">
          <TableHead className={HEAD_CLASS}>
            <span className="sr-only">Avatar</span>
          </TableHead>
          <TableHead className={HEAD_CLASS}>Usuario</TableHead>
          <TableHead className={`${HEAD_CLASS} text-center`}>Código / Tel</TableHead>
          <TableHead className={HEAD_CLASS}>Rol</TableHead>
          <TableHead className={`${HEAD_CLASS} text-center`}>Estado</TableHead>
          <TableHead className={`${HEAD_CLASS} text-center`}>Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.length === 0 ? (
          <TableRow className="hover:bg-transparent">
            <TableCell
              colSpan={6}
              className="h-[300px] text-center text-sm font-medium text-muted-foreground"
            >
              {emptyMessage}
            </TableCell>
          </TableRow>
        ) : (
          users.map((user) => (
            <UserRow
              key={user.id}
              user={user}
              roles={roles}
              currentUserId={currentUserId}
              isCurrentUserAdmin={isCurrentUserAdmin}
              isUpdating={updatingUserId === user.id}
              handlers={handlers}
            />
          ))
        )}
      </TableBody>
    </Table>
  );
}
