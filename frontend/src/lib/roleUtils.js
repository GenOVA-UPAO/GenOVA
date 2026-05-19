export function getRoleColorClasses(roleName) {
  if (!roleName) return 'bg-slate-50 text-slate-700 border-slate-200';
  
  const normalizedRole = roleName.toLowerCase().trim();
  
  switch (normalizedRole) {
    case 'administrador':
    case 'admin':
      return 'bg-indigo-50 text-indigo-700 border-indigo-200';
    case 'profesor':
    case 'teacher':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'estudiante':
    case 'student':
      return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'usuario':
    case 'user':
      return 'bg-slate-50 text-slate-700 border-slate-200';
    default:
      return 'bg-slate-50 text-slate-700 border-slate-200';
  }
}
