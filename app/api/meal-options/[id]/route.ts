import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { optionUpdateSchema } from "@/lib/validation/diet";

async function getOwnedOption(optionId: string, userId: string) {
  const option = await prisma.mealOption.findUnique({
    where: { id: optionId },
    include: { meal: { include: { dietDay: { include: { diet: true } } } } },
  });
  if (!option || option.meal.dietDay.diet.userId !== userId) return null;
  return option;
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const option = await getOwnedOption(params.id, session.user.id);
  if (!option) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = optionUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const updated = await prisma.mealOption.update({ where: { id: params.id }, data: parsed.data });
  return NextResponse.json({ option: updated });
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const option = await getOwnedOption(params.id, session.user.id);
  if (!option) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  await prisma.mealOption.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
