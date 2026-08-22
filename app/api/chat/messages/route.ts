import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { chatTextSchema, GOAL_LABELS } from "@/lib/validation/chat";
import { askNutritionAssistant, type ChatHistoryMessage } from "@/lib/gemini";
import { summarizeActiveDietForPrompt } from "@/lib/diet";

const IMAGE_MIME_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
const MAX_IMAGE_SIZE = 8 * 1024 * 1024; // 8 MB
const HISTORY_LIMIT = 20;

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const conversation = await prisma.conversation.upsert({
    where: { userId: session.user.id },
    update: {},
    create: { userId: session.user.id },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });

  return NextResponse.json({ conversation });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  if (!checkRateLimit(`chat:${session.user.id}`, { max: 15, windowMs: 60_000 })) {
    return NextResponse.json(
      { error: "Demasiados mensajes. Espera un poco antes de seguir." },
      { status: 429 },
    );
  }

  const formData = await request.formData();
  const rawText = formData.get("text");
  const image = formData.get("image");

  const textParsed = chatTextSchema.safeParse(typeof rawText === "string" ? rawText : "");
  const userText = textParsed.success ? textParsed.data : "";

  const hasImage = image instanceof File && image.size > 0;
  if (!userText && !hasImage) {
    return NextResponse.json(
      { error: "Escribe un mensaje o adjunta una imagen." },
      { status: 400 },
    );
  }

  let imageBuffer: Buffer | undefined;
  let imageMimeType: string | undefined;
  let imagePath: string | null = null;

  if (hasImage) {
    const file = image as File;
    const extension = IMAGE_MIME_EXTENSIONS[file.type];
    if (!extension) {
      return NextResponse.json(
        { error: "La imagen debe ser JPEG, PNG o WebP." },
        { status: 400 },
      );
    }
    if (file.size > MAX_IMAGE_SIZE) {
      return NextResponse.json(
        { error: "La imagen supera el tamaño máximo (8 MB)." },
        { status: 400 },
      );
    }

    imageBuffer = Buffer.from(await file.arrayBuffer());
    imageMimeType = file.type;

    const uploadsDir = path.join(process.cwd(), "prisma", "data", "uploads", "chat");
    await mkdir(uploadsDir, { recursive: true });
    const fileName = `${session.user.id}-${Date.now()}.${extension}`;
    await writeFile(path.join(uploadsDir, fileName), imageBuffer);
    imagePath = `chat/${fileName}`;
  }

  const [user, activeDiet, conversation] = await Promise.all([
    prisma.user.findUnique({ where: { id: session.user.id }, select: { goal: true } }),
    prisma.diet.findFirst({
      where: { userId: session.user.id, isActive: true },
      select: {
        title: true,
        days: {
          select: {
            dayOfWeek: true,
            meals: {
              select: {
                name: true,
                options: {
                  select: { name: true, items: { select: { ingredient: true, amount: true } } },
                },
              },
            },
          },
        },
      },
    }),
    prisma.conversation.upsert({
      where: { userId: session.user.id },
      update: {},
      create: { userId: session.user.id },
    }),
  ]);

  const previousMessages = await prisma.message.findMany({
    where: { conversationId: conversation.id },
    orderBy: { createdAt: "desc" },
    take: HISTORY_LIMIT,
    select: { role: true, content: true },
  });

  const history: ChatHistoryMessage[] = previousMessages
    .reverse()
    .map((m) => ({ role: m.role as "user" | "model", content: m.content }));

  const goalLabel = user?.goal ? GOAL_LABELS[user.goal as keyof typeof GOAL_LABELS] ?? null : null;
  const dietSummary = summarizeActiveDietForPrompt(activeDiet);

  let assistantReply: string;
  try {
    assistantReply = await askNutritionAssistant({
      history,
      userText,
      imageBuffer,
      imageMimeType,
      goalLabel,
      dietSummary,
    });
  } catch (error) {
    console.error("Error al consultar el asistente de Gemini:", error);
    return NextResponse.json(
      { error: "No se pudo obtener respuesta del asistente. Inténtalo de nuevo." },
      { status: 502 },
    );
  }

  const [userMessage, assistantMessage] = await prisma.$transaction([
    prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: "user",
        content: userText || "(imagen)",
        imagePath,
      },
    }),
    prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: "model",
        content: assistantReply,
      },
    }),
  ]);

  return NextResponse.json({ userMessage, assistantMessage }, { status: 201 });
}
