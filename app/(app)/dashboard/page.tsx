import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { DietViewer } from "@/components/diet/diet-viewer";
import { Button } from "@/components/ui/button";
import { UtensilsCrossed } from "lucide-react";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { diet?: string };
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const allDiets = await prisma.diet.findMany({
    where: { userId: session.user.id },
    select: { id: true, title: true, isActive: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });

  const selectedId =
    searchParams.diet && allDiets.some((d) => d.id === searchParams.diet)
      ? searchParams.diet
      : (allDiets.find((d) => d.isActive) ?? allDiets[0])?.id;

  const diet = selectedId
    ? await prisma.diet.findFirst({
        where: { id: selectedId, userId: session.user.id },
        include: {
          days: {
            include: {
              meals: {
                orderBy: { order: "asc" },
                include: {
                  options: {
                    include: { items: true },
                  },
                },
              },
            },
          },
        },
      })
    : null;

  if (!diet) {
    return (
      <main className="flex min-h-[calc(100dvh-3.5rem-env(safe-area-inset-top))] flex-col items-center justify-center gap-4 p-6 text-center">
        <UtensilsCrossed className="h-12 w-12 text-muted-foreground" />
        <h1 className="text-xl font-semibold">Aún no tienes una dieta activa</h1>
        <p className="max-w-xs text-sm text-muted-foreground">
          Sube el PDF de tu dieta y ByteBite la organizará por días y comidas automáticamente.
        </p>
        <Button asChild size="lg">
          <Link href="/upload">Subir mi dieta</Link>
        </Button>
      </main>
    );
  }

  return (
    <main className="mx-auto flex max-w-lg flex-col gap-4 px-4 pb-24 pt-6">
      <header className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">Dieta activa</p>
          <h1 className="truncate text-lg font-semibold leading-tight">{diet.title}</h1>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/upload">Nueva dieta</Link>
          </Button>
        </div>
      </header>

      <DietViewer days={diet.days} dietId={diet.id} />
    </main>
  );
}
