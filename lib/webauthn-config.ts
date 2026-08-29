export const RP_NAME = "ByteBite";

/**
 * WebAuthn ata una credencial al hostname exacto (`rpID`) y al origen exacto en el momento
 * de crearla. Se derivan de NEXTAUTH_URL en vez de pedir variables nuevas: si NEXTAUTH_URL
 * cambia de hostname en producción, las passkeys ya registradas dejan de verificar (mismo
 * comportamiento documentado en SECURITY.md).
 */
function appOrigin(): string {
  const url = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  return new URL(url).origin;
}

export function rpID(): string {
  return new URL(appOrigin()).hostname;
}

export function expectedOrigin(): string {
  return appOrigin();
}
