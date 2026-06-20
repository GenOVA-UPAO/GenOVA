import { CaretLeft, CaretRight } from '@phosphor-icons/react'
import { Button } from '@/core/components/ui/button'

export function OvaListPagination({ currentPage, totalPages, onPageChange }) {
  if (totalPages <= 1) return null
  return (
    <div className="flex items-center justify-between border-t border-border pt-4 px-1">
      <p className="text-xs text-muted-foreground font-medium">
        Página <span className="text-foreground font-bold">{currentPage}</span> de{' '}
        <span className="text-foreground font-bold">{totalPages}</span>
      </p>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
        >
          <CaretLeft size={16} weight="bold" />
          Anterior
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          Siguiente
          <CaretRight size={16} weight="bold" />
        </Button>
      </div>
    </div>
  )
}
