import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isExpiredSubscriptionError, sendPushNotification } from "@/lib/push";

/**
 * No la llama un usuario ni tiene sesión: la llama un cron externo (bytebite no tiene un
 * proceso de fondo propio — un único contenedor). Protegida por un secreto compartido, no por
 * cookie de sesión ni por la comprobación CSRF de origen (ver la excepción en middleware.ts):
 * un cron no es un navegador y no envía Origin/Sec-Fetch-Site.
 *
 * Compara `reminderHour` contra la hora local del servidor (`Date#getHours`, zona horaria del
 * proceso) — sin gestión de zona horaria por usuario, limitación documentada en README/
 * SECURITY.md, igual que opengym documenta la suya del sistema de unidades.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("x-cron-secret") !== secret) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const hour = new Date().getHours();
  const users = await prisma.user.findMany({
    where: { reminderEnabled: true, reminderHour: hour },
    include: { pushSubscriptions: true },
  });

  let sent = 0;
  let cleaned = 0;
  for (const user of users) {
    for (const subscription of user.pushSubscriptions) {
      try {
        await sendPushNotification(subscription, {
          title: "ByteBite",
          body: "Recuerda registrar lo que has comido hoy.",
        });
        sent++;
      } catch (error) {
        if (isExpiredSubscriptionError(error)) {
          await prisma.pushSubscription.delete({ where: { id: subscription.id } }).catch(() => {});
          cleaned++;
        } else {
          console.error("Error al enviar el recordatorio a", user.id, error);
        }
      }
    }
  }

  return NextResponse.json({ usersChecked: users.length, sent, cleaned });
}
