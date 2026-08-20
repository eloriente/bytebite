import Link from "next/link";
import { redirect } from "next/navigation";
import { UtensilsCrossed } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { DietListItem } from "@/components/diet/diet-list-item";

export default async function DietsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const diets = await prisma.diet.findMany({
    where: { userId: session.user.id },
    select: {
      id: true,
      title: true,
      isActive: true,
      _count: { select: { days: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="mx-auto flex max-w-lg flex-col gap-4 px-4 pb-24 pt-6">
      <header className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Gestionar dietas</h1>
        <Button asChild variant="outline" size="sm">
          <Link href="/upload">Nueva dieta</Link>
        </Button>
      </header>

      {diets.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <UtensilsCrossed className="h-12 w-12 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Aún no tienes dietas</h2>
          <p className="max-w-xs text-sm text-muted-foreground">
            Sube el PDF de tu dieta o créala manualmente.
          </p>
          <Button asChild size="lg">
            <Link href="/upload">Subir mi dieta</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {diets.map((diet) => (
            <DietListItem key={diet.id} diet={diet} />
          ))}
        </div>
      )}
    </main>
  );
}
