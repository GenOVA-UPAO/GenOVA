import "driver.js/dist/driver.css";
import "./crear-ova-tour.css";

import { driver } from "driver.js";
import { useEffect } from "react";

import { useCurrentUser } from "@/core/auth/auth-store";

export default function CrearOvaTour({ replay }: Readonly<{ replay: number }>) {
  const user = useCurrentUser();
  useEffect(() => {
    const key = `genova.crear-ova.tour.done.${String(user?.id ?? "anonymous")}`;
    try {
      if (replay === 0 && localStorage.getItem(key) === "1") return;
    } catch {
      return;
    }
    const tour = driver({
      popoverClass: "gn-tour",
      showProgress: true,
      nextBtnText: "Siguiente",
      prevBtnText: "Anterior",
      doneBtnText: "Listo",
      progressText: "{{current}} de {{total}}",
      steps: [
        {
          element: "#tour-crear-ova-prompt",
          popover: {
            title: "Describe tu tema",
            description: "Escribe el tema, objetivos y nivel educativo. También puedes usar el ejemplo.",
          },
        },
        {
          element: "#tour-crear-ova-config",
          popover: {
            title: "Elige recursos",
            description:
              "Pulsa Recursos para abrir el selector por fase. Debes elegir al menos un recurso en al menos 2 fases. Archivos y Tema son opcionales.",
          },
        },
        {
          element: "#tour-crear-ova-generar",
          popover: {
            title: "Genera el OVA",
            description: "Generar se habilita cuando el prompt es válido y hay recursos en al menos 2 fases.",
          },
        },
      ],
      // driver.js marca el elemento resaltado con aria-expanded, que no es
      // válido en un <section> (axe: aria-allowed-attr) y no aporta nada aquí.
      onHighlighted: (element?: Element) => {
        element?.removeAttribute("aria-expanded");
      },
      onDestroyed: () => {
        try {
          localStorage.setItem(key, "1");
        } catch {
          // Storage may be unavailable in private sessions.
        }
      },
    });
    tour.drive();
    return () => {
      tour.destroy();
    };
  }, [replay, user?.id]);
  return null;
}
