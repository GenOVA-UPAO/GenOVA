import { useState } from 'react'

export function EditUserModal({ user, onClose, onSave }) {
  const [form, setForm] = useState({
    full_name: user.full_name || '',
    email: user.email || '',
    university_id: user.university_id || '',
    gender: user.gender || 'otro',
    phone_number: user.phone_number || '',
  })

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function submit(e) {
    e.preventDefault()
    if (form.full_name.trim().length < 3) {
      alert('El nombre debe tener al menos 3 caracteres.')
      return
    }
    if (!form.email.includes('@') || !form.email.includes('.')) {
      alert('Ingresa un correo electrónico válido.')
      return
    }
    if (form.phone_number) {
      const cleaned = form.phone_number.replace(/[\s+-]/g, '')
      if (!/^\d+$/.test(cleaned)) {
        alert('El teléfono solo debe contener dígitos y el signo +.')
        return
      }
    }
    const payload = {
      full_name: form.full_name.trim(),
      email: form.email.trim(),
      university_id: form.university_id ? parseInt(form.university_id, 10) : null,
      gender: form.gender || null,
      phone_number: form.phone_number.trim() || null,
    }
    const ok = await onSave(user.id, payload)
    if (ok) onClose()
  }

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
      <div className="w-full max-w-md bg-white rounded-t-2xl sm:rounded-xl shadow-2xl border border-slate-100 overflow-hidden">
        <div className="px-5 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-800 truncate pr-2">
            Editar Perfil: {user.full_name || user.email}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-lg font-bold">
            ✕
          </button>
        </div>
        <form onSubmit={submit} className="p-5 sm:p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          <Field label="Nombre Completo">
            <input
              type="text" required value={form.full_name}
              onChange={(e) => update('full_name', e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              placeholder="Ej: Juan Pérez"
            />
          </Field>
          <Field label="Correo Electrónico">
            <input
              type="email" required value={form.email}
              onChange={(e) => update('email', e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              placeholder="ejemplo@correo.com"
            />
          </Field>
          <Field label="Código Universitario (UPAO)">
            <input
              type="number" min="1" value={form.university_id}
              onChange={(e) => update('university_id', e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              placeholder="Ej: 257022"
            />
            <p className="text-[10px] text-slate-400 mt-0.5">Se autocompletará con ceros a la izquierda a 9 dígitos.</p>
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Sexo / Género">
              <select
                value={form.gender} onChange={(e) => update('gender', e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              >
                <option value="masculino">Masculino</option>
                <option value="femenino">Femenino</option>
                <option value="otro">Otro</option>
              </select>
            </Field>
            <Field label="Teléfono">
              <input
                type="text" value={form.phone_number}
                onChange={(e) => update('phone_number', e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                placeholder="Ej: +51987285992"
              />
            </Field>
          </div>
          <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row justify-end gap-2.5">
            <button type="button" onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50">
              Cancelar
            </button>
            <button type="submit"
              className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold">
              Guardar Cambios
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">{label}</label>
      {children}
    </div>
  )
}
