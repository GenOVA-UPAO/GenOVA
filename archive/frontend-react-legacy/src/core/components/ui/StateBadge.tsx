import { cva, type VariantProps } from 'class-variance-authority'
import type { ComponentProps } from 'react'
import { cn } from '@/core/lib/utils'

// Pill de estado semántico, anclado a los tokens UPAO (nada de colores crudos).
const stateBadgeVariants = cva(
  'inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold whitespace-nowrap',
  {
    variants: {
      status: {
        neutral: 'bg-muted text-muted-foreground border-border',
        info: 'bg-primary/5 text-primary border-primary/15',
        success: 'bg-primary/10 text-primary border-primary/20',
        warning: 'bg-accent-brand/10 text-accent-brand border-accent-brand/25',
        error: 'bg-destructive/10 text-destructive border-destructive/20',
      },
    },
    defaultVariants: { status: 'neutral' },
  },
)

type StateBadgeProps = ComponentProps<'span'> &
  VariantProps<typeof stateBadgeVariants>

export function StateBadge({
  status = 'neutral',
  className,
  ...props
}: StateBadgeProps) {
  return (
    <span
      data-slot="state-badge"
      className={cn(stateBadgeVariants({ status }), className)}
      {...props}
    />
  )
}

export { stateBadgeVariants }
