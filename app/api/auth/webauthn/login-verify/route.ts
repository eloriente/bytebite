import { NextRequest, NextResponse } from "next/server";
import { verifyAuthenticationResponse } from "@simplewebauthn/server";
import { isoBase64URL } from "@simplewebauthn/server/helpers";
import type { AuthenticatorTransportFuture } from "@simplewebauthn/types";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { expectedOrigin, rpID } from "@/lib/webauthn-config";
import { putPostAuthToken, takePendingLogin } from "@/lib/webauthn-store";

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!checkRateLimit(`passkey-login:${ip}`, { max: 20, windowMs: 60_000 })) {
    return NextResponse.json(
      { error: "Demasiados intentos. Inténtalo más tarde." },
      { status: 429 },
    );
  }

  const body = await request.json().catch(() => null);
  const cid = typeof body?.cid === "string" ? body.cid : null;
  const credential = body?.credential;
  const credentialId = typeof credential?.id === "string" ? credential.id : null;
  if (!cid || !credential || !credentialId) {
    return NextResponse.json({ error: "Petición inválida." }, { status: 400 });
  }

  const pending = await takePendingLogin(cid);
  if (!pending) {
    return NextResponse.json(
      { error: "La sesión de inicio de sesión ha expirado. Inténtalo de nuevo." },
      { status: 400 },
    );
  }

  const authenticator = await prisma.authenticator.findUnique({ where: { credentialId } });
  if (!authenticator) {
    return NextResponse.json({ error: "Passkey no reconocida." }, { status: 404 });
  }

  let verification;
  try {
    verification = await verifyAuthenticationResponse({
      response: credential,
      expectedChallenge: pending.challenge,
      expectedOrigin: expectedOrigin(),
      expectedRPID: rpID(),
      requireUserVerification: false,
      authenticator: {
        credentialID: isoBase64URL.toBuffer(authenticator.credentialId),
        credentialPublicKey: isoBase64URL.toBuffer(authenticator.publicKey),
        counter: authenticator.counter,
        transports: authenticator.transports
          ? (authenticator.transports.split(",") as AuthenticatorTransportFuture[])
          : undefined,
      },
    });
  } catch (error) {
    console.error("Error al verificar el login con passkey:", error);
    return NextResponse.json({ error: "No se pudo verificar la passkey." }, { status: 400 });
  }

  if (!verification.verified) {
    return NextResponse.json({ error: "No se pudo verificar la passkey." }, { status: 400 });
  }

  await prisma.authenticator.update({
    where: { credentialId },
    data: { counter: verification.authenticationInfo.newCounter },
  });

  const token = await putPostAuthToken(authenticator.userId);
  return NextResponse.json({ ok: true, token });
}
