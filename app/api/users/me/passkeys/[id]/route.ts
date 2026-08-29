import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const authenticator = await prisma.authenticator.findUnique({ where: { id: params.id } });
  if (!authenticator || authenticator.userId !== session.user.id) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  const count = await prisma.authenticator.count({ where: { userId: session.user.id } });
  if (count <= 1) {
    return NextResponse.json(
      { error: "Necesitas al menos una passkey para poder entrar." },
      { status: 400 },
    );
  }

  await prisma.authenticator.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
