import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      name: true,
      goal: true,
      createdAt: true,
      diets: {
        select: {
          title: true,
          isActive: true,
          createdAt: true,
          days: {
            select: {
              dayOfWeek: true,
              meals: {
                select: {
                  name: true,
                  order: true,
                  options: {
                    select: {
                      name: true,
                      description: true,
                      items: {
                        select: {
                          ingredient: true,
                          amount: true,
                          checked: true,
                          calories: true,
                          protein: true,
                          carbs: true,
                          fat: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const filename = `bytebite-export-${new Date().toISOString().slice(0, 10)}.json`;

  return new NextResponse(JSON.stringify(user, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
