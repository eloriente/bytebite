import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const day = await prisma.dietDay.findUnique({
    where: { id: params.id },
    include: { diet: true },
  });

  if (!day || day.diet.userId !== session.user.id) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  await prisma.dietDay.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
