"use client";

import { useEffect, useState } from "react";

export function InstallTip() {
  const [platform, setPlatform] = useState<"ios" | "android" | "other">("other");

  useEffect(() => {
    const ua = navigator.userAgent;
    if (/iphone|ipad|ipod/i.test(ua)) setPlatform("ios");
    else if (/android/i.test(ua)) setPlatform("android");
  }, []);

  if (platform === "ios") {
    return (
      <p className="text-sm text-muted-foreground">
        En Safari: toca <strong>Compartir</strong> → <strong>Añadir a pantalla de inicio</strong>.
      </p>
    );
  }

  if (platform === "android") {
    return (
      <p className="text-sm text-muted-foreground">
        En Chrome: toca el menú <strong>⋮</strong> → <strong>Añadir a pantalla de inicio</strong>.
      </p>
    );
  }

  return (
    <p className="text-sm text-muted-foreground">
      Abre esta página desde el móvil para instalar ByteBite como app.
    </p>
  );
}
