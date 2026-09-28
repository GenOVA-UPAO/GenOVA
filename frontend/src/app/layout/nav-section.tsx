import type { ReactNode } from "react";

interface NavSectionProps {
  title: string;
  collapsed: boolean;
  children: ReactNode;
}

export function NavSection({ title, collapsed, children }: Readonly<NavSectionProps>) {
  return (
    <div>
      {collapsed ? (
        <div className="mx-2 my-3 border-t border-sidebar-border" aria-hidden="true" />
      ) : (
        <p className="px-3 pt-5 pb-1.5 text-xs font-medium text-muted-foreground">{title}</p>
      )}
      <ul className="space-y-0.5">{children}</ul>
    </div>
  );
}
