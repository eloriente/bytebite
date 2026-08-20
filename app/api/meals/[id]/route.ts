import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { mealUpdateSchema } from "@/lib/validation/diet";

async function getOwnedMeal(mealId: string, userId: string) {
  const meal = await prisma.meal.findUnique({
    where: { id: mealId },
    include: { dietDay: { include: { diet: true } } },
  });
  if (!meal || meal.dietDay.diet.userId !== userId) return null;
  return meal;
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const meal = await getOwnedMeal(params.id, session.user.id);
  if (!meal) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = mealUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const updated = await prisma.meal.update({ where: { id: params.id }, data: parsed.data });
  return NextResponse.json({ meal: updated });
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const meal = await getOwnedMeal(params.id, session.user.id);
  if (!meal) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  await prisma.meal.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
