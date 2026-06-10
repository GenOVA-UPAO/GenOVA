import { isLockedOut } from './statusHelpers.js'

function Item({ onClick, tone = 'text-slate-700 hover:bg-slate-50', icon, label, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`w-full px-4 py-2 text-xs flex items-center gap-2 transition-colors ${
        disabled ? 'text-slate-300 cursor-not-allowed' : `${tone} cursor-pointer`
      }`}
    >
      <span>{icon}</span> {label}
    </button>
  )
}

export function UserActionMenu({
  user,
  onEdit,
  onToggleStatus,
  onUnlock,
  onSendResetEmail,
  onSendResetWhatsApp,
  onClose,
}) {
  function close(fn) {
    onClose?.()
    return fn
  }
  return (
    <div className="absolute right-2 sm:right-5 mt-1 w-52 rounded-lg bg-white shadow-xl border border-slate-200 py-1.5 z-20 text-left">
      <Item icon="✏️" label="Editar Perfil" onClick={() => close(onEdit)()} />
      <Item
        icon={user.is_active ? '🚫' : '✅'}
        label={user.is_active ? 'Desactivar Cuenta' : 'Activar Cuenta'}
        tone={user.is_active ? 'text-amber-700 hover:bg-amber-50' : 'text-emerald-700 hover:bg-emerald-50'}
        onClick={() => close(() => onToggleStatus(user.id, !user.is_active))()}
      />
      {isLockedOut(user) && (
        <Item
          icon="🔓"
          label="Desbloquear Cuenta"
          tone="text-indigo-700 hover:bg-indigo-50"
          onClick={() => close(() => onUnlock(user.id))()}
        />
      )}
      <div className="border-t border-slate-100 my-1" />
      <Item icon="✉️" label="Restablecer por Correo" onClick={() => close(() => onSendResetEmail(user.id))()} />
      {user.phone_number ? (
        <Item
          icon="💬"
          label="Enlace WhatsApp"
          tone="text-emerald-800 hover:bg-emerald-50"
          onClick={() => close(() => onSendResetWhatsApp(user.id))()}
        />
      ) : (
        <Item icon="💬" label="Sin Teléfono" disabled />
      )}
    </div>
  )
}
