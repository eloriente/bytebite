"use client";

import { useEffect } from "react";

/** Registra el service worker una vez, al montar el layout protegido. No renderiza nada. */
export function PushRegistration() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  return null;
}
