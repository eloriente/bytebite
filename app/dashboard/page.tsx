import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { DietViewer } from "@/components/diet/diet-viewer";
import { Button } from "@/components/ui/button";
import { UtensilsCrossed } from "lucide-react";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const diet = await prisma.diet.findFirst({
    where: { userId: session.user.id, isActive: true },
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
  });

  if (!diet) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
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
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col gap-4 px-4 pb-24 pt-6">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">Dieta activa</p>
          <h1 className="text-lg font-semibold leading-tight">{diet.title}</h1>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/upload">Nueva dieta</Link>
        </Button>
      </header>

      <DietViewer days={diet.days} />
    </main>
  );
}
