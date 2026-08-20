import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { createDietSchema } from "@/lib/validation/diet";
import { createDietForUser } from "@/lib/diet";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createDietSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const diet = await createDietForUser(session.user.id, parsed.data, null);
  return NextResponse.json({ diet }, { status: 201 });
}
