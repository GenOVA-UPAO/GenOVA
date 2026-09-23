import { TabsList, TabsTrigger } from "@/core/components/ui/tabs";

// Pestañas de sección en línea (las mismas que Modelos de IA). Radix marca la
// activa con `data-state="active"`, así que el subrayado se ancla a ese atributo.
const LIST_CLASS =
  "h-auto w-full justify-start gap-1 overflow-x-auto rounded-none border-b border-border bg-transparent p-0";
const TRIGGER_CLASS =
  "relative h-11 flex-none rounded-md px-3 text-foreground/65 hover:text-foreground data-[state=active]:text-foreground after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:rounded-full after:bg-primary after:opacity-0 after:transition-opacity data-[state=active]:after:opacity-100 dark:text-muted-foreground dark:data-[state=active]:text-foreground";

interface ProfileTabsListProps {
  isAdmin: boolean;
}

export function ProfileTabsList({ isAdmin }: Readonly<ProfileTabsListProps>) {
  return (
    <TabsList variant="line" className={LIST_CLASS}>
      <TabsTrigger value="info" className={TRIGGER_CLASS}>
        Información
      </TabsTrigger>
      {isAdmin && (
        <TabsTrigger value="config" className={TRIGGER_CLASS}>
          Configuración
        </TabsTrigger>
      )}
      <TabsTrigger value="security" className={TRIGGER_CLASS}>
        Seguridad
      </TabsTrigger>
    </TabsList>
  );
}
