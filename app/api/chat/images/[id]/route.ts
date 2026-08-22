import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const EXTENSION_MIME_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const message = await prisma.message.findUnique({
    where: { id: params.id },
    include: { conversation: { select: { userId: true } } },
  });

  if (!message || message.conversation.userId !== session.user.id || !message.imagePath) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  const extension = message.imagePath.split(".").pop() ?? "";
  const mimeType = EXTENSION_MIME_TYPES[extension] ?? "application/octet-stream";

  try {
    const filePath = path.join(process.cwd(), "prisma", "data", "uploads", message.imagePath);
    const buffer = await readFile(filePath);
    return new NextResponse(buffer, { headers: { "Content-Type": mimeType } });
  } catch {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }
}
