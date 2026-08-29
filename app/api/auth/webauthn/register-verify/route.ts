import { NextRequest, NextResponse } from "next/server";
import { verifyRegistrationResponse } from "@simplewebauthn/server";
import { isoBase64URL } from "@simplewebauthn/server/helpers";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { expectedOrigin, rpID } from "@/lib/webauthn-config";
import { putPostAuthToken, takePendingRegistration } from "@/lib/webauthn-store";

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!checkRateLimit(`passkey-register:${ip}`, { max: 10, windowMs: 60_000 })) {
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

  const pending = await takePendingRegistration(cid);
  if (!pending) {
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

  const alreadyRegistered = await prisma.authenticator.findUnique({ where: { credentialId } });
  if (alreadyRegistered) {
    return NextResponse.json({ error: "Esa passkey ya está registrada." }, { status: 409 });
  }

  try {
    const user = await prisma.user.create({
      data: {
        name: pending.name,
        email: pending.email,
        authenticators: {
          create: {
            credentialId,
            publicKey: isoBase64URL.fromBuffer(credentialPublicKey),
            counter,
            transports: credential.response?.transports?.join(",") ?? null,
          },
        },
      },
      select: { id: true },
    });

    const token = await putPostAuthToken(user.id);
    return NextResponse.json({ ok: true, token }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "Ese email ya tiene una cuenta." }, { status: 409 });
    }
    console.error("Error al crear la cuenta con passkey:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
