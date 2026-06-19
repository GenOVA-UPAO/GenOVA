import { PaperPlaneTilt } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'

export default function LinkRow({ link, onDelete, onResend, admin = false, isOwner = false }) {
  const person = admin ? link.linked || { email: link.invite_email } : link.linked || { email: link.invite_email }
  const isPending = link.status === 'pending'
  return (
    <div className="flex items-center gap-4 border-b border-border/50 px-5 py-4 last:border-0 hover:bg-accent/30 transition-colors">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-accent-brand/20 text-sm font-bold text-primary shadow-sm border border-primary/20">
        {(person?.full_name || person?.email || '?').slice(0, 2).toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold">{person?.full_name || person?.email || 'Invitación pendiente'}</p>
        <p className="truncate text-xs font-medium text-muted-foreground mt-0.5">
          {admin && link.owner ? `${link.owner.email} -> ` : ''}
          {person?.email || link.invite_email || 'Sin email'} · <span className={link.status === 'activo' ? 'text-emerald-600' : 'text-amber-600'}>{link.status}</span>
        </p>
      </div>
      {isPending && isOwner && (
        <Button variant="ghost" size="sm" onClick={() => onResend(link.id)} className="text-primary hover:bg-primary/10 hover:text-primary">
          <PaperPlaneTilt size={14} weight="bold" className="mr-1.5" /> Reenviar
        </Button>
      )}
      <Button variant="outline" size="sm" onClick={() => onDelete(link.id)} className="border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive shadow-sm">
        {isPending ? 'Cancelar' : 'Desvincular'}
      </Button>
    </div>
  )
}
