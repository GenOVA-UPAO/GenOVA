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
        <div className="pt-3" aria-hidden="true" />
      ) : (
        <p className="px-2 pt-4 pb-1.5 text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
          {title}
        </p>
      )}
      <ul className="space-y-1">{children}</ul>
    </div>
  );
}
