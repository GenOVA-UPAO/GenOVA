import { Button } from "@/core/components/ui/button";

export function CreationSteps({ onTour }: Readonly<{ onTour: () => void }>) {
  return (
    <div className="relative">
      <ol aria-label="Pasos para crear un OVA" className="flex justify-around gap-3 py-4 pr-8 text-xs font-semibold">
        {["1. Describe", "2. Elige recursos", "3. Genera"].map((text) => (
          <li key={text}>{text}</li>
        ))}
      </ol>
      <Button className="absolute top-0 right-0" variant="ghost" size="icon-sm" aria-label="Ver tutorial" onClick={onTour}>
        ?
      </Button>
    </div>
  );
}
