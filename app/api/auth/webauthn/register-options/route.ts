import { NextRequest, NextResponse } from "next/server";
import { generateRegistrationOptions } from "@simplewebauthn/server";
import { isoBase64URL } from "@simplewebauthn/server/helpers";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { passkeyRegisterOptionsSchema } from "@/lib/validation/auth";
import { RP_NAME, rpID } from "@/lib/webauthn-config";
import { putPendingRegistration } from "@/lib/webauthn-store";

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!checkRateLimit(`passkey-register:${ip}`, { max: 10, windowMs: 60_000 })) {
    return NextResponse.json(
      { error: "Demasiados intentos. Inténtalo más tarde." },
      { status: 429 },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = passkeyRegisterOptionsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }
  const { name, email } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) {
    return NextResponse.json({ error: "Ese email ya tiene una cuenta." }, { status: 409 });
  }

  // userID es opaco para WebAuthn: no necesita coincidir con el id de Prisma, que todavía
  // no existe (el User se crea en register-verify, solo si la ceremonia se completa).
  const userID = isoBase64URL.fromBuffer(crypto.getRandomValues(new Uint8Array(16)));

  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID: rpID(),
    userID,
    userName: email,
    userDisplayName: name,
    attestationType: "none",
    authenticatorSelection: { residentKey: "required", userVerification: "preferred" },
  });

  const cid = await putPendingRegistration(options.challenge, name, email);

  return NextResponse.json({ cid, options });
}
