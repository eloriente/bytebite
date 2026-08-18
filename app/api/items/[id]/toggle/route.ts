import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const item = await prisma.item.findUnique({
    where: { id: params.id },
    include: {
      mealOption: {
        include: { meal: { include: { dietDay: { include: { diet: true } } } } },
      },
    },
  });

  if (!item || item.mealOption.meal.dietDay.diet.userId !== session.user.id) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  const updated = await prisma.item.update({
    where: { id: params.id },
    data: { checked: !item.checked },
  });

  return NextResponse.json({ item: updated });
}
