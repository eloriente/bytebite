import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { GoalForm } from "@/components/settings/goal-form";
import { AccountSection } from "@/components/settings/account-section";
import { PasskeyManager } from "@/components/settings/passkey-manager";
import { NotificationsSection } from "@/components/settings/notifications-section";
import { DataSection } from "@/components/settings/data-section";
import { InstallTip } from "@/components/settings/install-tip";
import { AppearanceSection } from "@/components/settings/appearance-section";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const authenticators = await prisma.authenticator.findMany({
    where: { userId: user.id },
    select: { id: true, transports: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  return (
    <main className="mx-auto flex max-w-lg flex-col gap-6 px-4 pb-[calc(var(--tabbar-h)+1.5rem+var(--sab))] pt-6">
      <h1 className="t-title">Ajustes</h1>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold">Cuenta</h2>
        <AccountSection name={user.name} email={user.email} />
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold">Apariencia</h2>
        <AppearanceSection />
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold">Tu objetivo</h2>
        <p className="text-sm text-muted-foreground">
          El asistente nutricional lo usa para darte consejos más ajustados a lo que buscas.
        </p>
        <GoalForm initialGoal={user.goal} />
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold">Notificaciones</h2>
        <NotificationsSection
          initialReminderEnabled={user.reminderEnabled}
          initialReminderHour={user.reminderHour}
        />
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold">Passkeys</h2>
        <p className="text-sm text-muted-foreground">
          Añade una passkey por cada dispositivo desde el que quieras entrar.
        </p>
        <PasskeyManager
          passkeys={authenticators.map((a) => ({
            id: a.id,
            transports: a.transports,
            createdAt: a.createdAt.toISOString(),
          }))}
        />
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold">Tus datos</h2>
        <DataSection />
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold">Instalar la app</h2>
        <InstallTip />
      </section>
    </main>
  );
}
