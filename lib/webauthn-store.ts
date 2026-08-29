import { prisma } from "@/lib/prisma";

/**
 * Estado de corta vida del ceremonial WebAuthn, persistido en `PendingAuthAction` (Prisma):
 *
 * - El challenge de cada intento de registro/login, de un solo uso, con TTL corto.
 * - Un token de "recién verificado por passkey" de un solo uso: el paso de verify
 *   (que corre en una llamada API normal) lo genera, y el authorize() de NextAuth lo
 *   consume para emitir la sesión — así toda la emisión de sesión pasa por un único
 *   sitio (auth.ts) en vez de reimplementar el cookie de sesión a mano.
 *
 * No es un Map en memoria: cada Route Handler de Next.js puede compilarse/instanciarse por
 * separado (sobre todo en dev), así que el estado de un módulo no se comparte de forma
 * fiable entre /options y /verify, o entre /verify y el authorize() de NextAuth — se
 * observó en la práctica como fallos intermitentes de login/registro. La base de datos sí
 * es compartida de verdad entre rutas.
 */

const CHALLENGE_TTL_MS = 5 * 60_000;
const TOKEN_TTL_MS = 60_000;

type Kind = "webauthn-register" | "webauthn-login" | "webauthn-attach" | "post-auth-token";

interface PendingRegistration {
  challenge: string;
  name: string;
  email: string;
}

interface PendingLogin {
  challenge: string;
}

interface PendingAttachment {
  challenge: string;
  userId: string;
}

async function take<T>(id: string, kind: Kind): Promise<T | null> {
  const row = await prisma.pendingAuthAction.delete({ where: { id } }).catch(() => null);
  if (!row || row.kind !== kind || row.expiresAt.getTime() < Date.now()) return null;
  return JSON.parse(row.data) as T;
}

export async function putPendingRegistration(
  challenge: string,
  name: string,
  email: string,
): Promise<string> {
  const row = await prisma.pendingAuthAction.create({
    data: {
      kind: "webauthn-register",
      data: JSON.stringify({ challenge, name, email } satisfies PendingRegistration),
      expiresAt: new Date(Date.now() + CHALLENGE_TTL_MS),
    },
  });
  return row.id;
}

export function takePendingRegistration(cid: string): Promise<PendingRegistration | null> {
  return take<PendingRegistration>(cid, "webauthn-register");
}

export async function putPendingLogin(challenge: string): Promise<string> {
  const row = await prisma.pendingAuthAction.create({
    data: {
      kind: "webauthn-login",
      data: JSON.stringify({ challenge } satisfies PendingLogin),
      expiresAt: new Date(Date.now() + CHALLENGE_TTL_MS),
    },
  });
  return row.id;
}

export function takePendingLogin(cid: string): Promise<PendingLogin | null> {
  return take<PendingLogin>(cid, "webauthn-login");
}

export async function putPendingPasskeyAttachment(
  challenge: string,
  userId: string,
): Promise<string> {
  const row = await prisma.pendingAuthAction.create({
    data: {
      kind: "webauthn-attach",
      data: JSON.stringify({ challenge, userId } satisfies PendingAttachment),
      expiresAt: new Date(Date.now() + CHALLENGE_TTL_MS),
    },
  });
  return row.id;
}

export function takePendingPasskeyAttachment(cid: string): Promise<PendingAttachment | null> {
  return take<PendingAttachment>(cid, "webauthn-attach");
}

export async function putPostAuthToken(userId: string): Promise<string> {
  const row = await prisma.pendingAuthAction.create({
    data: {
      kind: "post-auth-token",
      data: JSON.stringify({ userId }),
      expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
    },
  });
  return row.id;
}

export async function takePostAuthToken(token: string): Promise<string | null> {
  const entry = await take<{ userId: string }>(token, "post-auth-token");
  return entry?.userId ?? null;
}
