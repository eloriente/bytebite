import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ChatView } from "@/components/chat/chat-view";

export default async function ChatPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const conversation = await prisma.conversation.upsert({
    where: { userId: session.user.id },
    update: {},
    create: { userId: session.user.id },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });

  return (
    <main className="mx-auto flex h-[calc(100dvh-3.5rem-env(safe-area-inset-top))] w-full max-w-lg flex-col">
      <ChatView
        initialMessages={conversation.messages.map((m) => ({
          id: m.id,
          role: m.role as "user" | "model",
          content: m.content,
          imagePath: m.imagePath,
        }))}
      />
    </main>
  );
}
