import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { isExpiredSubscriptionError, sendPushNotification } from "@/lib/push";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  if (!checkRateLimit(`push-test:${session.user.id}`, { max: 5, windowMs: 60_000 })) {
    return NextResponse.json(
      { error: "Demasiados intentos. Inténtalo más tarde." },
      { status: 429 },
    );
  }

  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId: session.user.id },
  });
  if (subscriptions.length === 0) {
    return NextResponse.json({ error: "Activa antes las notificaciones push." }, { status: 400 });
  }

  let sent = 0;
  for (const subscription of subscriptions) {
    try {
      await sendPushNotification(subscription, {
        title: "ByteBite",
        body: "Notificación de prueba — todo funciona.",
      });
      sent++;
    } catch (error) {
      if (isExpiredSubscriptionError(error)) {
        await prisma.pushSubscription.delete({ where: { id: subscription.id } }).catch(() => {});
      } else {
        console.error("Error al enviar la notificación de prueba:", error);
      }
    }
  }

  if (sent === 0) {
    return NextResponse.json({ error: "No se pudo enviar la notificación." }, { status: 502 });
  }

  return NextResponse.json({ ok: true, sent });
}
