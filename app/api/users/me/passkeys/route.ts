import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const authenticators = await prisma.authenticator.findMany({
    where: { userId: session.user.id },
    select: { id: true, transports: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ authenticators });
}
