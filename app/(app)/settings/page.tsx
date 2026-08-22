import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { GoalForm } from "@/components/settings/goal-form";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { goal: true },
  });

  return (
    <main className="mx-auto flex max-w-lg flex-col gap-6 px-4 pb-24 pt-6">
      <h1 className="text-xl font-semibold">Ajustes</h1>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold">Tu objetivo</h2>
        <p className="text-sm text-muted-foreground">
          El asistente nutricional lo usa para darte consejos más ajustados a lo que buscas.
        </p>
        <GoalForm initialGoal={user?.goal ?? null} />
      </section>
    </main>
  );
}
