// Pestañas de sección en línea, iguales a las del perfil. Radix marca la activa
// con `data-state="active"`, así que el subrayado se ancla a ese atributo.
export const SECTION_TABS_LIST =
  "h-auto w-full justify-start gap-1 overflow-x-auto rounded-none border-b border-border bg-transparent p-0";
export const SECTION_TABS_TRIGGER =
  "relative h-11 flex-none rounded-md px-3 text-foreground/65 hover:text-foreground data-[state=active]:text-foreground after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:rounded-full after:bg-primary after:opacity-0 after:transition-opacity data-[state=active]:after:opacity-100 dark:text-muted-foreground dark:data-[state=active]:text-foreground";
