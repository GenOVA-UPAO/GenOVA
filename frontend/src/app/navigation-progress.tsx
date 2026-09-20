import { useNavigation } from "react-router";

/** Thin top progress bar while a lazy chunk / guard loader is resolving. */
export function NavigationProgress() {
  const navigation = useNavigation();
  if (navigation.state === "idle") return null;
  return (
    <div
      role="progressbar"
      aria-label="Cargando página"
      className="fixed inset-x-0 top-0 z-[100] h-0.5 overflow-hidden bg-primary/15"
    >
      <div className="h-full w-1/3 animate-[nav-progress_1s_ease-in-out_infinite] bg-primary" />
    </div>
  );
}
