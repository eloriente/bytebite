import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
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

  try {
    const diet = await extractDietFromPdf(buffer);
    return NextResponse.json({ diet }, { status: 200 });
  } catch (error) {
    console.error("Error al procesar el PDF con Gemini:", error);
    return NextResponse.json(
      { error: "No se pudo procesar el PDF. Puedes rellenar la dieta manualmente." },
      { status: 502 },
    );
  }
}
