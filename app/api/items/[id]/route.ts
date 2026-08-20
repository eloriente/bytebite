import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { itemUpdateSchema } from "@/lib/validation/diet";

async function getOwnedItem(itemId: string, userId: string) {
  const item = await prisma.item.findUnique({
    where: { id: itemId },
    include: {
      mealOption: { include: { meal: { include: { dietDay: { include: { diet: true } } } } } },
    },
  });
  if (!item || item.mealOption.meal.dietDay.diet.userId !== userId) return null;
  return item;
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const item = await getOwnedItem(params.id, session.user.id);
  if (!item) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = itemUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const updated = await prisma.item.update({ where: { id: params.id }, data: parsed.data });
  return NextResponse.json({ item: updated });
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const item = await getOwnedItem(params.id, session.user.id);
  if (!item) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  await prisma.item.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
