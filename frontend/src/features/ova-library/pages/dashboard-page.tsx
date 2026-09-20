import { useCurrentUser, useIsAdmin } from "@/core/auth/auth-store";
import { QueryErrorState } from "@/core/components/query-error-state";

import { DashboardBody } from "../components/dashboard-body";
import { DashboardHeader } from "../components/dashboard-header";
import { DashboardSkeleton } from "../components/dashboard-skeleton";
import { useOvaList } from "../hooks/use-ova-library";
import { getUserFirstName } from "./dashboard-page.helpers";

/** Página principal de bienvenida y resumen de la biblioteca de OVAs. */
export function DashboardPage() {
  const user = useCurrentUser();
  const isAdmin = useIsAdmin();
  const { data, isLoading, error, refetch } = useOvaList({ page: 1 });
  const firstName = getUserFirstName(user?.full_name);

  let content = (
    <DashboardBody ovas={data?.ovas ?? []} total={data?.total_items ?? 0} isAdmin={isAdmin} />
  );
  if (isLoading) {
    content = <DashboardSkeleton />;
  } else if (error) {
    content = (
      <QueryErrorState
        title="No se pudo cargar el resumen"
        onRetry={() => {
          void refetch();
        }}
      />
    );
  }

  return (
    <section className="mx-auto max-w-7xl space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <DashboardHeader firstName={firstName} />
      {content}
    </section>
  );
}
