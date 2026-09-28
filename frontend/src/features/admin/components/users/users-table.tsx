import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/core/components/ui/table";

import type { AdminUser, Role, UsersHandlers } from "../../lib/types";
import { UserRow } from "./user-row";

const HEAD_CLASS = "h-10 px-4 text-xs font-medium text-muted-foreground";

interface UsersTableProps {
  users: AdminUser[];
  roles: Role[];
  currentUserId: string;
  isCurrentUserAdmin: boolean;
  updatingUserId: string;
  handlers: UsersHandlers;
}

export function UsersTable({
  users,
  roles,
  currentUserId,
  isCurrentUserAdmin,
  updatingUserId,
  handlers,
}: Readonly<UsersTableProps>) {
  return (
    <Table className="max-md:block md:table-fixed">
      <TableHeader className="max-md:sr-only">
        <TableRow className="bg-muted/40 hover:bg-muted/40">
          <TableHead className={`${HEAD_CLASS} w-[46%]`}>Usuario</TableHead>
          <TableHead className={`${HEAD_CLASS} w-[26%]`}>Rol</TableHead>
          <TableHead className={HEAD_CLASS}>Estado</TableHead>
          <TableHead className={`${HEAD_CLASS} w-16`}>
            <span className="sr-only">Acciones</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody className="max-md:block max-md:divide-y max-md:divide-border">
        {users.map((user) => (
          <UserRow
            key={user.id}
            user={user}
            roles={roles}
            currentUserId={currentUserId}
            isCurrentUserAdmin={isCurrentUserAdmin}
            isUpdating={updatingUserId === user.id}
            handlers={handlers}
          />
        ))}
      </TableBody>
    </Table>
  );
}
