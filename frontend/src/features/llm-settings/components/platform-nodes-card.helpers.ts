export function getNodeInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2);
}

export function getNodeBadgeColor(name: string, warning: boolean): string {
  if (warning) return "bg-amber-500";
  const colors = [
    "bg-blue-500",
    "bg-emerald-500",
    "bg-purple-500",
    "bg-amber-500",
    "bg-teal-500",
    "bg-indigo-500",
  ];
  return colors[name.length % colors.length];
}
