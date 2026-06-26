import { useState } from 'react'
import { Eye, EyeSlash } from '@phosphor-icons/react'
import { cn } from '@/core/lib/utils'
import { Input } from '@/core/components/ui/input'

// React 19: `ref` es un prop normal, ya no hace falta forwardRef.
function PasswordInput({
  className,
  id,
  type = 'password',
  revealable = true,
  revealLabel = 'Mostrar contraseña',
  hideLabel = 'Ocultar contraseña',
  disabled,
  ref,
  ...props
}) {
  const [showPassword, setShowPassword] = useState(false)
  const isPassword = type === 'password'
  const visible = isPassword && showPassword

  return (
    <div className="relative">
      <Input
        ref={ref}
        id={id}
        type={visible ? 'text' : type}
        disabled={disabled}
        className={cn('pr-10', className)}
        {...props}
      />
      {revealable && isPassword && (
        <button
          type="button"
          disabled={disabled}
          onClick={() => setShowPassword((value) => !value)}
          aria-label={showPassword ? hideLabel : revealLabel}
          title={showPassword ? hideLabel : revealLabel}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50"
        >
          {showPassword ? <EyeSlash size={18} weight="duotone" aria-hidden="true" /> : <Eye size={18} weight="duotone" aria-hidden="true" />}
        </button>
      )}
    </div>
  )
}

export { PasswordInput }
