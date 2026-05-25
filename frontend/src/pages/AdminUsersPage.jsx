import { useState } from 'react'
import { useUsersAdmin } from '../hooks/useUsersAdmin.js'

export function AdminUsersPage() {
  const {
    users,
    roles,
    loading,
    error,
    updatingUserId,
    updateError,
    currentUser,
    currentPage,
    totalPages,
    totalItems,
    fetchUsers,
    handleRoleChange,
    handleEditUser,
    handleToggleStatus,
    handleUnlockUser,
    handleSendResetEmail,
    handleGenerateResetWhatsApp,
    handlePageChange,
    getRoleColorClasses,
    setUpdateError,
  } = useUsersAdmin()

  // UI state
  const [activeMenuUserId, setActiveMenuUserId] = useState(null)
  const [editingUser, setEditingUser] = useState(null)

  // Edit Modal Form State
  const [editName, setEditName] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editUniversityId, setEditUniversityId] = useState('')
  const [editGender, setEditGender] = useState('')
  const [editPhone, setEditPhone] = useState('')

  const isCurrentUserAdmin = currentUser && currentUser.role === 'administrador'

  const toggleMenu = (userId) => {
    if (activeMenuUserId === userId) {
      setActiveMenuUserId(null)
    } else {
      setActiveMenuUserId(userId)
    }
  }

  const openEditModal = (user) => {
    setEditingUser(user)
    setEditName(user.full_name || '')
    setEditEmail(user.email || '')
    setEditUniversityId(user.university_id || '')
    setEditGender(user.gender || 'otro')
    setEditPhone(user.phone_number || '')
    setActiveMenuUserId(null)
  }

  const closeEditModal = () => {
    setEditingUser(null)
  }

  const submitEdit = async (e) => {
    e.preventDefault()
    
    // Validations
    if (editName.trim().length < 3) {
      alert('El nombre debe tener al menos 3 caracteres.')
      return
    }
    if (!editEmail.includes('@') || !editEmail.includes('.')) {
      alert('Ingresa un correo electrónico válido.')
      return
    }
    if (editPhone) {
      const cleanedPhone = editPhone.replace('+', '').replace(' ', '').replace('-', '')
      if (isNaN(cleanedPhone)) {
        alert('El número de teléfono solo debe contener números y opcionalmente el signo +.')
        return
      }
    }

    const payload = {
      full_name: editName.trim(),
      email: editEmail.trim(),
      university_id: editUniversityId ? parseInt(editUniversityId, 10) : null,
      gender: editGender || null,
      phone_number: editPhone.trim() || null,
    }

    const success = await handleEditUser(editingUser.id, payload)
    if (success) {
      closeEditModal()
    }
  }

  const runWhatsAppReset = async (userId) => {
    setActiveMenuUserId(null)
    const data = await handleGenerateResetWhatsApp(userId)
    if (data && data.phone_number && data.text) {
      // Dejar únicamente los dígitos numéricos
      let phoneClean = data.phone_number.replace(/\D/g, '')
      // Si el número tiene 9 dígitos (celular local peruano), autocompletar con el código de país 51
      if (phoneClean.length === 9) {
        phoneClean = '51' + phoneClean
      }
      const url = `https://api.whatsapp.com/send?phone=${phoneClean}&text=${encodeURIComponent(data.text)}`
      window.open(url, '_blank')
    }
  }

  // Check if a user is currently locked out
  const isLockedOut = (user) => {
    if (!user.locked_until) return false
    return new Date(user.locked_until) > new Date()
  }

  return (
    <div className="space-y-6 relative">
      <div className="flex flex-col gap-1.5 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Gestión de Usuarios
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Administra las cuentas registradas en el sistema y define sus roles y permisos.
          </p>
        </div>
        <div className="bg-slate-100 rounded-lg px-3 py-1.5 text-xs text-slate-600 font-semibold self-start md:self-auto border border-slate-200 shadow-sm">
          Total: <span className="text-indigo-600 font-bold text-sm">{totalItems}</span> usuarios
        </div>
      </div>

      {updateError && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 flex items-center justify-between shadow-sm">
          <div className="flex gap-2">
            <span>⚠️</span>
            <span>{updateError}</span>
          </div>
          <button onClick={() => setUpdateError('')} className="text-rose-600 hover:text-rose-800 font-bold text-xs cursor-pointer">
            Ignorar
          </button>
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white shadow-md overflow-hidden">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-600"></div>
              <p className="text-xs text-slate-400">Cargando usuarios...</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex h-64 items-center justify-center p-6 text-center">
            <div className="max-w-md space-y-3">
              <p className="text-sm text-rose-600 font-medium">{error}</p>
              <button
                onClick={() => fetchUsers(currentPage)}
                className="rounded-lg bg-slate-100 px-4 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 transition-all cursor-pointer"
              >
                Reintentar
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto min-h-[400px]">
            <table className="w-full border-collapse text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                <tr>
                  <th scope="col" className="px-3 py-3 w-[18%] min-w-[120px] whitespace-nowrap">Nombre Completo</th>
                  <th scope="col" className="px-3 py-3 w-[18%] min-w-[140px] whitespace-nowrap">Correo Electrónico</th>
                  <th scope="col" className="px-3 py-3 w-[12%] min-w-[90px] whitespace-nowrap">Código UPAO</th>
                  <th scope="col" className="px-3 py-3 w-[10%] min-w-[80px] whitespace-nowrap">Teléfono</th>
                  <th scope="col" className="px-3 py-3 w-[10%] min-w-[70px] whitespace-nowrap">Estado</th>
                  <th scope="col" className="px-3 py-3 w-[20%] min-w-[140px] whitespace-nowrap">Rol Asignado</th>
                  <th scope="col" className="px-3 py-3 w-[12%] min-w-[80px] text-center whitespace-nowrap">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {users.map((user) => {
                  const isMe = currentUser && currentUser.id === user.id
                  const isUpdating = updatingUserId === user.id
                  const targetIsAdmin = user.role?.name === 'administrador'
                  
                  // Escalation prevention: non-admin callers cannot edit or change admins
                  const isActionsDisabled = targetIsAdmin && !isCurrentUserAdmin

                  // Format University ID
                  const formattedUnivId = user.university_id
                    ? String(user.university_id).padStart(9, '0')
                    : <span className="text-slate-400 italic">--</span>

                  // Resolve Status Label
                  let statusBadge = (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                      Activo
                    </span>
                  )
                  if (!user.is_active) {
                    statusBadge = (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                        Inactivo
                      </span>
                    )
                  } else if (isLockedOut(user)) {
                    statusBadge = (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-800" title={`Bloqueado hasta ${new Date(user.locked_until).toLocaleString()}`}>
                        🔒 Bloqueado
                      </span>
                    )
                  }

                  return (
                    <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="whitespace-nowrap px-3 py-3 font-semibold text-slate-900">
                        {user.full_name || <span className="text-slate-400 italic font-normal">No especificado</span>}
                      </td>
                      <td className="px-3 py-3 text-slate-700 whitespace-nowrap">
                        {user.email}
                      </td>
                      <td className="px-3 py-3 text-slate-600 font-mono text-xs">
                        {formattedUnivId}
                      </td>
                      <td className="px-3 py-3 text-slate-500 whitespace-nowrap">
                        {user.phone_number || <span className="text-slate-400 italic">--</span>}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        {statusBadge}
                      </td>
                      <td className="px-3 py-3">
                        {isMe ? (
                          <div className="flex flex-row items-center gap-1.5">
                            <span className={`inline-flex items-center h-8 w-[140px] rounded-lg border px-3 text-xs font-semibold select-none capitalize ${getRoleColorClasses(user.role?.name || 'administrador')}`}>
                              {user.role?.name || 'Administrador'}
                            </span>
                            <span className="text-[11px] text-slate-400 font-medium italic whitespace-nowrap">
                              🧿
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2.5">
                            <select
                              value={user.role?.id || (roles.length > 0 ? roles[0].id : '')}
                              onChange={(e) => handleRoleChange(user.id, e.target.value)}
                              className={`h-8 w-[140px] rounded-lg border px-3 text-xs font-semibold focus:outline-none transition-colors cursor-pointer capitalize disabled:opacity-50 disabled:cursor-not-allowed ${getRoleColorClasses(user.role?.name)}`}
                              disabled={isUpdating || isActionsDisabled}
                            >
                              {roles.map((r) => {
                                // Prevent non-admins from assigning the administrator role
                                if (r.name === 'administrador' && !isCurrentUserAdmin) {
                                  return null
                                }
                                return (
                                  <option key={r.id} value={r.id} className="capitalize bg-white text-slate-700 font-medium">
                                    {r.name}
                                  </option>
                                )
                              })}
                            </select>
                            {isUpdating && (
                              <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-indigo-600"></div>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-3 text-center relative whitespace-nowrap">
                        {isMe || isActionsDisabled ? (
                          <span className="text-slate-300 text-xs italic">Protegido</span>
                        ) : (
                          <div>
                            <button
                              onClick={() => toggleMenu(user.id)}
                              className="px-3 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer select-none"
                            >
                              Acción ▾
                            </button>
                            
                            {activeMenuUserId === user.id && (
                              <div className="absolute right-5 mt-1 w-48 rounded-lg bg-white shadow-xl border border-slate-200 py-1.5 z-10 text-left">
                                <button
                                  onClick={() => openEditModal(user)}
                                  className="w-full px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors cursor-pointer"
                                >
                                  <span>✏️</span> Editar Perfil
                                </button>
                                
                                <button
                                  onClick={() => {
                                    setActiveMenuUserId(null)
                                    handleToggleStatus(user.id, !user.is_active)
                                  }}
                                  className={`w-full px-4 py-2 text-xs flex items-center gap-2 transition-colors cursor-pointer ${user.is_active ? 'text-amber-700 hover:bg-amber-50' : 'text-emerald-700 hover:bg-emerald-50'}`}
                                >
                                  <span>{user.is_active ? '🚫' : '✅'}</span>
                                  {user.is_active ? 'Desactivar Cuenta' : 'Activar Cuenta'}
                                </button>

                                {isLockedOut(user) && (
                                  <button
                                    onClick={() => {
                                      setActiveMenuUserId(null)
                                      handleUnlockUser(user.id)
                                    }}
                                    className="w-full px-4 py-2 text-xs text-indigo-700 hover:bg-indigo-50 flex items-center gap-2 transition-colors cursor-pointer"
                                  >
                                    <span>🔓</span> Desbloquear Cuenta
                                  </button>
                                )}

                                <div className="border-t border-slate-100 my-1"></div>

                                <button
                                  onClick={() => {
                                    setActiveMenuUserId(null)
                                    handleSendResetEmail(user.id)
                                  }}
                                  className="w-full px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors cursor-pointer"
                                >
                                  <span>✉️</span> Restablecer por Correo
                                </button>

                                {user.phone_number ? (
                                  <button
                                    onClick={() => runWhatsAppReset(user.id)}
                                    className="w-full px-4 py-2 text-xs text-emerald-800 hover:bg-emerald-50 flex items-center gap-2 transition-colors cursor-pointer"
                                  >
                                    <span>💬</span> Enlace WhatsApp (wa.me)
                                  </button>
                                ) : (
                                  <button
                                    disabled
                                    className="w-full px-4 py-2 text-xs text-slate-300 flex items-center gap-2 cursor-not-allowed"
                                    title="El usuario no tiene teléfono registrado"
                                  >
                                    <span>💬</span> Sin Teléfono
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {!loading && !error && totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-slate-200 pt-4 px-1">
          <p className="text-xs text-slate-500 font-medium">
            Página <span className="text-slate-800 font-bold">{currentPage}</span> de <span className="text-slate-800 font-bold">{totalPages}</span>
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="rounded-lg border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
            >
              &lt;&lt; Anterior
            </button>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="rounded-lg border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Siguiente &gt;&gt;
            </button>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="w-full max-w-md bg-white rounded-xl shadow-2xl border border-slate-100 overflow-hidden">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-800">
                Editar Perfil: {editingUser.full_name || editingUser.email}
              </h2>
              <button
                onClick={closeEditModal}
                className="text-slate-400 hover:text-slate-600 transition-colors text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={submitEdit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Nombre Completo
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                  placeholder="Ej: Juan Pérez"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Correo Electrónico
                </label>
                <input
                  type="email"
                  required
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                  placeholder="ejemplo@correo.com"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Código Universitario (UPAO)
                </label>
                <input
                  type="number"
                  value={editUniversityId}
                  onChange={(e) => setEditUniversityId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                  placeholder="Ej: 257022"
                  min="1"
                />
                <p className="text-[10px] text-slate-400 mt-0.5">Se autocompletará con ceros a la izquierda a 9 dígitos.</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Sexo / Género
                  </label>
                  <select
                    value={editGender}
                    onChange={(e) => setEditGender(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all cursor-pointer"
                  >
                    <option value="masculino">Masculino</option>
                    <option value="femenino">Femenino</option>
                    <option value="otro">Otro</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Teléfono
                  </label>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                    placeholder="Ej: +51987285992"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-all shadow-sm shadow-indigo-600/10 cursor-pointer"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
