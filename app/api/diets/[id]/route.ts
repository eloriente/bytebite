import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { dietRenameSchema } from "@/lib/validation/diet";

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
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

  const body = await request.json().catch(() => null);
  const parsed = dietRenameSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
      { status: 400 },
    );
  }

  const updated = await prisma.diet.update({
    where: { id: params.id },
    data: { title: parsed.data.title },
  });

  return NextResponse.json({ diet: updated });
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
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

  await prisma.diet.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
