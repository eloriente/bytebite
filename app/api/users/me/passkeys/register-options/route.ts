import { NextResponse } from "next/server";
import { generateRegistrationOptions } from "@simplewebauthn/server";
import { isoBase64URL } from "@simplewebauthn/server/helpers";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { RP_NAME, rpID } from "@/lib/webauthn-config";
import { putPendingPasskeyAttachment } from "@/lib/webauthn-store";

export async function POST() {
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

  const [user, existing] = await Promise.all([
    prisma.user.findUnique({ where: { id: session.user.id }, select: { email: true, name: true } }),
    prisma.authenticator.findMany({
      where: { userId: session.user.id },
      select: { credentialId: true },
    }),
  ]);
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID: rpID(),
    userID: isoBase64URL.fromBuffer(crypto.getRandomValues(new Uint8Array(16))),
    userName: user.email,
    userDisplayName: user.name,
    attestationType: "none",
    authenticatorSelection: { residentKey: "required", userVerification: "preferred" },
    // Evita que el mismo autenticador se pueda registrar dos veces como passkey distinta
    // de esta cuenta.
    excludeCredentials: existing.map((a) => ({
      id: isoBase64URL.toBuffer(a.credentialId),
      type: "public-key" as const,
    })),
  });

  const cid = await putPendingPasskeyAttachment(options.challenge, session.user.id);

  return NextResponse.json({ cid, options });
}
