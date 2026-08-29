import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getVapidPublicKey } from "@/lib/push";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const publicKey = getVapidPublicKey();
  if (!publicKey) {
    return NextResponse.json(
      { error: "Las notificaciones push no están configuradas en este servidor." },
      { status: 503 },
    );
  }

  return NextResponse.json({ publicKey });
}
