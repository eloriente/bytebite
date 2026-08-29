import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { goalUpdateSchema } from "@/lib/validation/chat";
import { nameUpdateSchema, reminderUpdateSchema } from "@/lib/validation/user";

export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);

  if (body && typeof body === "object" && "name" in body) {
    const parsed = nameUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", issues: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }
    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: { name: parsed.data.name },
      select: { id: true, name: true },
    });
    return NextResponse.json({ user });
  }

  if (body && typeof body === "object" && "reminderEnabled" in body) {
    const parsed = reminderUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", issues: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }
    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        reminderEnabled: parsed.data.reminderEnabled,
        reminderHour: parsed.data.reminderHour,
      },
      select: { id: true, reminderEnabled: true, reminderHour: true },
    });
    return NextResponse.json({ user });
  }

  const parsed = goalUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: { goal: parsed.data.goal },
    select: { id: true, goal: true },
  });

  return NextResponse.json({ user });
}

export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  if (!checkRateLimit(`delete-account:${session.user.id}`, { max: 3, windowMs: 60_000 })) {
    return NextResponse.json(
      { error: "Demasiados intentos. Inténtalo más tarde." },
      { status: 429 },
    );
  }

  await prisma.user.delete({ where: { id: session.user.id } });

  return NextResponse.json({ ok: true });
}
