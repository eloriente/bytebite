import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { messageActionSchema } from "@/lib/validation/chat";
import { dietEditOperationsSchema, type DietEditOperation } from "@/lib/validation/diet";

async function getOwnedPendingEditMessage(messageId: string, userId: string) {
  const message = await prisma.message.findUnique({
    where: { id: messageId },
    include: { conversation: true },
  });
  if (
    !message ||
    message.conversation.userId !== userId ||
    message.role !== "model" ||
    message.editStatus !== "pending"
  ) {
    return null;
  }
  return message;
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const message = await getOwnedPendingEditMessage(params.id, session.user.id);
  if (!message) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsedAction = messageActionSchema.safeParse(body);
  if (!parsedAction.success) {
    return NextResponse.json({ error: "Acción inválida" }, { status: 400 });
  }

  if (parsedAction.data.action === "discard") {
    const updated = await prisma.message.update({
      where: { id: message.id },
      data: { editStatus: "discarded" },
    });
    return NextResponse.json({ message: updated, applied: 0, skipped: 0 });
  }

  const rawOps = message.editOperations ? JSON.parse(message.editOperations) : [];
  const parsedOps = dietEditOperationsSchema.safeParse(rawOps);
  const operations: DietEditOperation[] = parsedOps.success ? parsedOps.data : [];

  const activeDiet = await prisma.diet.findFirst({
    where: { userId: session.user.id, isActive: true },
    select: {
      days: {
        select: {
          meals: {
            select: {
              options: {
                select: { id: true, items: { select: { id: true } } },
              },
            },
          },
        },
      },
    },
  });

  const validOptionIds = new Set(
    activeDiet?.days.flatMap((d) => d.meals.flatMap((m) => m.options.map((o) => o.id))) ?? [],
  );
  const validItemIds = new Set(
    activeDiet?.days.flatMap((d) =>
      d.meals.flatMap((m) => m.options.flatMap((o) => o.items.map((i) => i.id))),
    ) ?? [],
  );

  const applicable = operations.filter((op) =>
    op.action === "add_item" ? validOptionIds.has(op.mealOptionId) : validItemIds.has(op.itemId),
  );
  const skipped = operations.length - applicable.length;

  await prisma.$transaction(
    applicable.map((op) => {
      if (op.action === "add_item") {
        return prisma.item.create({
          data: {
            mealOptionId: op.mealOptionId,
            ingredient: op.ingredient,
            amount: op.amount,
            calories: op.calories ?? null,
            protein: op.protein ?? null,
            carbs: op.carbs ?? null,
            fat: op.fat ?? null,
          },
        });
      }
      if (op.action === "update_item") {
        const { itemId, action, ...fields } = op;
        return prisma.item.update({ where: { id: itemId }, data: fields });
      }
      return prisma.item.delete({ where: { id: op.itemId } });
    }),
  );

  const updated = await prisma.message.update({
    where: { id: message.id },
    data: { editStatus: "applied" },
  });

  return NextResponse.json({ message: updated, applied: applicable.length, skipped });
}
