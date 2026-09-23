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
            description: "Escribe el tema, los objetivos y el nivel. Si quieres ver cómo se hace, pulsa «Usar ejemplo».",
          },
        },
        {
          element: "#tour-crear-ova-config",
          popover: {
            title: "Elige recursos",
            description:
              "Pulsa Recursos para elegir qué generará la IA en cada fase. Necesitas recursos en al menos 2 fases. Archivos, Tema y Nivel educativo son opcionales.",
          },
        },
        {
          element: "#tour-crear-ova-generar",
          popover: {
            title: "Genera el OVA",
            description: "«Generar OVA» se activa cuando la descripción tiene al menos 10 caracteres y hay recursos en 2 fases. Si falta algo, lo verás junto al botón.",
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
