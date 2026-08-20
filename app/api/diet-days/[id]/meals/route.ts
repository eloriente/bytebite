import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { mealCreateSchema } from "@/lib/validation/diet";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = mealCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const day = await prisma.dietDay.findUnique({
    where: { id: params.id },
    include: { diet: true },
  });
  if (!day || day.diet.userId !== session.user.id) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  const meal = await prisma.meal.create({
    data: { dietDayId: params.id, name: parsed.data.name, order: parsed.data.order },
  });

  return NextResponse.json({ meal }, { status: 201 });
}
