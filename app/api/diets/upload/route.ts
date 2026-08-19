import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { extractDietFromPdf } from "@/lib/gemini";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No se ha recibido ningún PDF" }, { status: 400 });
  }

  if (file.type !== "application/pdf") {
    return NextResponse.json({ error: "El archivo debe ser un PDF" }, { status: 400 });
  }

  const MAX_SIZE = 20 * 1024 * 1024; // 20 MB
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "El PDF supera el tamaño máximo (20 MB)" }, { status: 400 });
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  let parsedDiet;
  try {
    parsedDiet = await extractDietFromPdf(buffer);
  } catch (error) {
    console.error("Error al procesar el PDF con Gemini:", error);
    return NextResponse.json(
      { error: "No se pudo extraer la dieta del PDF. Inténtalo de nuevo." },
      { status: 502 },
    );
  }

  const uploadsDir = path.join(process.cwd(), "prisma", "data", "uploads");
  await mkdir(uploadsDir, { recursive: true });
  const fileName = `${session.user.id}-${Date.now()}.pdf`;
  const pdfPath = path.join(uploadsDir, fileName);
  await writeFile(pdfPath, buffer);

  const diet = await prisma.$transaction(async (tx) => {
    // Solo una dieta activa por usuario a la vez.
    await tx.diet.updateMany({
      where: { userId: session.user.id, isActive: true },
      data: { isActive: false },
    });

    return tx.diet.create({
      data: {
        userId: session.user.id,
        title: parsedDiet.title,
        isActive: true,
        pdfPath: `uploads/${fileName}`,
        days: {
          create: parsedDiet.days.map((day) => ({
            dayOfWeek: day.dayOfWeek,
            meals: {
              create: day.meals.map((meal) => ({
                name: meal.name,
                order: meal.order,
                options: {
                  create: meal.options.map((option) => ({
                    name: option.name,
                    description: option.description ?? null,
                    items: {
                      create: option.items.map((item) => ({
                        ingredient: item.ingredient,
                        amount: item.amount,
                        calories: item.calories ?? null,
                        protein: item.protein ?? null,
                        carbs: item.carbs ?? null,
                        fat: item.fat ?? null,
                      })),
                    },
                  })),
                },
              })),
            },
          })),
        },
      },
      select: { id: true, title: true },
    });
  });

  return NextResponse.json({ diet }, { status: 201 });
}
