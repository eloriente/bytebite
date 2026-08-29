import { NextRequest, NextResponse } from "next/server";
import { generateAuthenticationOptions } from "@simplewebauthn/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { rpID } from "@/lib/webauthn-config";
import { putPendingLogin } from "@/lib/webauthn-store";

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!checkRateLimit(`passkey-login:${ip}`, { max: 20, windowMs: 60_000 })) {
    return NextResponse.json(
      { error: "Demasiados intentos. Inténtalo más tarde." },
      { status: 429 },
    );
  }

  // Sin allowCredentials: login sin usuario, el propio navegador/SO elige entre las
  // passkeys que tenga guardadas para este rpID (requiere que se registraran como
  // "resident key", ver register-options).
  const options = await generateAuthenticationOptions({
    rpID: rpID(),
    userVerification: "preferred",
  });

  const cid = await putPendingLogin(options.challenge);
  return NextResponse.json({ cid, options });
}
