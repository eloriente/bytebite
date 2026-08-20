import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(_request: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const diet = await prisma.diet.findUnique({
    where: { id: params.id },
    select: { userId: true },
  });

  if (!diet || diet.userId !== session.user.id) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  await prisma.$transaction([
    prisma.diet.updateMany({
      where: { userId: session.user.id, isActive: true },
      data: { isActive: false },
    }),
    prisma.diet.update({ where: { id: params.id }, data: { isActive: true } }),
  ]);

  return NextResponse.json({ ok: true });
}
