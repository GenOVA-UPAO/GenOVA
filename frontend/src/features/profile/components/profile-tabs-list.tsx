import { Icon } from "@/core/components/icon";
import { TabsList, TabsTrigger } from "@/core/components/ui/tabs";
import { cn } from "@/core/lib/cn";

const TRIGGER_CLASS = cn(
  "shrink-0 gap-1.5 rounded-lg px-4 py-2 text-xs font-bold text-muted-foreground transition",
  "data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm",
);

interface ProfileTabsListProps {
  isAdmin: boolean;
}

export function ProfileTabsList({ isAdmin }: Readonly<ProfileTabsListProps>) {
  return (
    <TabsList className="h-auto w-fit max-w-full items-center gap-0.5 overflow-x-auto border border-border/60 bg-card p-1 shadow-sm group-data-horizontal/tabs:h-auto">
      <TabsTrigger value="info" className={TRIGGER_CLASS}>
        <Icon name="user" size="text-xs" /> Información
      </TabsTrigger>
      {isAdmin && (
        <TabsTrigger value="config" className={TRIGGER_CLASS}>
          <Icon name="sliders-horizontal" size="text-xs" /> Configuración
        </TabsTrigger>
      )}
      <TabsTrigger value="security" className={TRIGGER_CLASS}>
        <Icon name="lock" size="text-xs" /> Seguridad
      </TabsTrigger>
    </TabsList>
  );
}
