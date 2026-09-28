import "driver.js/dist/driver.css";
import "./crear-ova-tour.css";

import { driver } from "driver.js";
import { useEffect } from "react";

import { useCurrentUser } from "@/core/auth/auth-store";

import { crearOvaTourConfig } from "./crear-ova-tour-config";

export default function CrearOvaTour({ replay }: Readonly<{ replay: number }>) {
  const user = useCurrentUser();
  useEffect(() => {
    const key = `genova.crear-ova.tour.done.${String(user?.id ?? "anonymous")}`;
    try {
      if (replay === 0 && localStorage.getItem(key) === "1") return;
    } catch {
      return;
    }
    const tour = driver(
      crearOvaTourConfig(() => {
        try {
          localStorage.setItem(key, "1");
        } catch {
          // Storage may be unavailable in private sessions.
        }
      }),
    );
    tour.drive();
    return () => {
      tour.destroy();
    };
  }, [replay, user?.id]);
  return null;
}
