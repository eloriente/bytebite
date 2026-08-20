import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { itemCreateSchema } from "@/lib/validation/diet";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = itemCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const option = await prisma.mealOption.findUnique({
    where: { id: params.id },
    include: { meal: { include: { dietDay: { include: { diet: true } } } } },
  });
  if (!option || option.meal.dietDay.diet.userId !== session.user.id) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  const item = await prisma.item.create({
    data: {
      mealOptionId: params.id,
      ingredient: parsed.data.ingredient,
      amount: parsed.data.amount,
      calories: parsed.data.calories ?? null,
      protein: parsed.data.protein ?? null,
      carbs: parsed.data.carbs ?? null,
      fat: parsed.data.fat ?? null,
    },
  });

  return NextResponse.json({ item }, { status: 201 });
}
