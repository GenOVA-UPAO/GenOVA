import { cva, type VariantProps } from "class-variance-authority";
import { Dialog as SheetPrimitive } from "radix-ui";
import type { ComponentProps } from "react";

import { cn } from "@/core/lib/cn";

// Panel lateral (drawer) sobre Radix Dialog: foco atrapado, Esc y clic fuera cierran.
const sheetContentVariants = cva(
  "fixed z-50 flex flex-col bg-background shadow-xl outline-none data-[state=open]:animate-in data-[state=closed]:animate-out",
  {
    variants: {
      side: {
        left: "inset-y-0 left-0 w-72 max-w-[85vw] data-[state=open]:slide-in-from-left data-[state=closed]:slide-out-to-left",
        right:
          "inset-y-0 right-0 w-72 max-w-[85vw] data-[state=open]:slide-in-from-right data-[state=closed]:slide-out-to-right",
      },
    },
    defaultVariants: { side: "left" },
  },
);

function Sheet(props: Readonly<ComponentProps<typeof SheetPrimitive.Root>>) {
  return <SheetPrimitive.Root data-slot="sheet" {...props} />;
}

function SheetTrigger(props: Readonly<ComponentProps<typeof SheetPrimitive.Trigger>>) {
  return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />;
}

function SheetClose(props: Readonly<ComponentProps<typeof SheetPrimitive.Close>>) {
  return <SheetPrimitive.Close data-slot="sheet-close" {...props} />;
}

function SheetOverlay({
  className,
  ...props
}: Readonly<ComponentProps<typeof SheetPrimitive.Overlay>>) {
  return (
    <SheetPrimitive.Overlay
      data-slot="sheet-overlay"
      className={cn(
        "fixed inset-0 z-40 bg-foreground/30 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0",
        className,
      )}
      {...props}
    />
  );
}

type SheetContentProps = ComponentProps<typeof SheetPrimitive.Content> &
  VariantProps<typeof sheetContentVariants> & { overlayClassName?: string };

function SheetContent({
  className,
  overlayClassName,
  side,
  children,
  ...props
}: Readonly<SheetContentProps>) {
  return (
    <SheetPrimitive.Portal>
      <SheetOverlay className={overlayClassName} />
      <SheetPrimitive.Content
        data-slot="sheet-content"
        className={cn(sheetContentVariants({ side }), className)}
        {...props}
      >
        {children}
      </SheetPrimitive.Content>
    </SheetPrimitive.Portal>
  );
}

function SheetTitle({
  className,
  ...props
}: Readonly<ComponentProps<typeof SheetPrimitive.Title>>) {
  return (
    <SheetPrimitive.Title
      data-slot="sheet-title"
      className={cn("font-heading text-base font-medium", className)}
      {...props}
    />
  );
}

function SheetDescription({
  className,
  ...props
}: Readonly<ComponentProps<typeof SheetPrimitive.Description>>) {
  return (
    <SheetPrimitive.Description
      data-slot="sheet-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

export {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetOverlay,
  SheetTitle,
  SheetTrigger,
};
