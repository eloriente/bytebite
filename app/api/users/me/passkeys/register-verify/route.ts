import { NextRequest, NextResponse } from "next/server";
import { verifyRegistrationResponse } from "@simplewebauthn/server";
import { isoBase64URL } from "@simplewebauthn/server/helpers";
import { Prisma } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { expectedOrigin, rpID } from "@/lib/webauthn-config";
import { takePendingPasskeyAttachment } from "@/lib/webauthn-store";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  if (!checkRateLimit(`passkey-attach:${session.user.id}`, { max: 10, windowMs: 60_000 })) {
    return NextResponse.json(
      { error: "Demasiados intentos. Inténtalo más tarde." },
      { status: 429 },
    );
  }

  const body = await request.json().catch(() => null);
  const cid = typeof body?.cid === "string" ? body.cid : null;
  const credential = body?.credential;
  if (!cid || !credential) {
    return NextResponse.json({ error: "Petición inválida." }, { status: 400 });
  }

  const pending = await takePendingPasskeyAttachment(cid);
  // Defensa en profundidad: el `cid` está atado al usuario que pidió las opciones, no solo
  // a la sesión actual — si alguien reutilizara un `cid` ajeno, esto lo bloquea.
  if (!pending || pending.userId !== session.user.id) {
    return NextResponse.json(
      { error: "La sesión de registro ha expirado. Inténtalo de nuevo." },
      { status: 400 },
    );
  }

  let verification;
  try {
    verification = await verifyRegistrationResponse({
      response: credential,
      expectedChallenge: pending.challenge,
      expectedOrigin: expectedOrigin(),
      expectedRPID: rpID(),
      requireUserVerification: false,
    });
  } catch (error) {
    console.error("Error al verificar el registro de la passkey:", error);
    return NextResponse.json({ error: "No se pudo verificar la passkey." }, { status: 400 });
  }

  if (!verification.verified || !verification.registrationInfo) {
    return NextResponse.json({ error: "No se pudo verificar la passkey." }, { status: 400 });
  }

  const { credentialID, credentialPublicKey, counter } = verification.registrationInfo;
  const credentialId = isoBase64URL.fromBuffer(credentialID);

  try {
    await prisma.authenticator.create({
      data: {
        userId: session.user.id,
        credentialId,
        publicKey: isoBase64URL.fromBuffer(credentialPublicKey),
        counter,
        transports: credential.response?.transports?.join(",") ?? null,
      },
    });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "Esa passkey ya está registrada." }, { status: 409 });
    }
    console.error("Error al añadir la passkey:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
