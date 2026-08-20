import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { dayCreateSchema } from "@/lib/validation/diet";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = dayCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const diet = await prisma.diet.findUnique({
    where: { id: parsed.data.dietId },
    select: { userId: true },
  });
  if (!diet || diet.userId !== session.user.id) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  const day = await prisma.dietDay.create({
    data: { dietId: parsed.data.dietId, dayOfWeek: parsed.data.dayOfWeek },
  });

  return NextResponse.json({ day }, { status: 201 });
}
