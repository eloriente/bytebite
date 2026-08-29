"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { parseErrorBody, urlBase64ToUint8Array } from "@/lib/utils";

const HOURS = Array.from({ length: 24 }, (_, hour) => hour);

async function getExistingSubscription() {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return null;
  const registration = await navigator.serviceWorker.ready;
  return registration.pushManager.getSubscription();
}

export function NotificationsSection({
  initialReminderEnabled,
  initialReminderHour,
}: {
  initialReminderEnabled: boolean;
  initialReminderHour: number | null;
}) {
  const [supported, setSupported] = useState(true);
  const [subscribed, setSubscribed] = useState(false);
  const [reminderEnabled, setReminderEnabled] = useState(initialReminderEnabled);
  const [reminderHour, setReminderHour] = useState(initialReminderHour ?? 20);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setSupported(false);
      return;
    }
    getExistingSubscription().then((sub) => setSubscribed(!!sub));
  }, []);

  async function enablePush() {
    setError(null);
    setLoading(true);
    try {
      const keyRes = await fetch("/api/push/public-key");
      if (!keyRes.ok) {
        throw new Error(await parseErrorBody(keyRes, "No se pudo activar las notificaciones."));
      }
      const { publicKey } = await keyRes.json();

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
      });

      const subscribeRes = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription.toJSON()),
      });
      if (!subscribeRes.ok) {
        throw new Error(
          await parseErrorBody(subscribeRes, "No se pudo activar las notificaciones."),
        );
      }

      setSubscribed(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo activar las notificaciones.");
    } finally {
      setLoading(false);
    }
  }

  async function disablePush() {
    setError(null);
    setLoading(true);
    try {
      const subscription = await getExistingSubscription();
      if (subscription) {
        await fetch("/api/push/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
        await subscription.unsubscribe();
      }
      setSubscribed(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo desactivar las notificaciones.");
    } finally {
      setLoading(false);
    }
  }

  async function saveReminder(enabled: boolean, hour: number) {
    setReminderEnabled(enabled);
    setReminderHour(hour);
    await fetch("/api/users/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reminderEnabled: enabled, reminderHour: enabled ? hour : null }),
    });
  }

  async function sendTest() {
    setError(null);
    setMessage(null);
    const res = await fetch("/api/push/test", { method: "POST" });
    if (!res.ok) {
      setError(await parseErrorBody(res, "No se pudo enviar la notificación de prueba."));
      return;
    }
    setMessage("Notificación enviada.");
  }

  if (!supported) {
    return (
      <p className="text-sm text-muted-foreground">
        Este navegador no soporta notificaciones push.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <Button
        type="button"
        variant="outline"
        className="w-full"
        disabled={loading}
        onClick={subscribed ? disablePush : enablePush}
      >
        {subscribed ? "Desactivar notificaciones push" : "Activar notificaciones push"}
      </Button>

      {subscribed && (
        <div className="space-y-2 rounded-md border p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm">Recordatorio diario</span>
            <Button
              type="button"
              variant={reminderEnabled ? "default" : "outline"}
              size="sm"
              onClick={() => saveReminder(!reminderEnabled, reminderHour)}
            >
              {reminderEnabled ? "Activado" : "Desactivado"}
            </Button>
          </div>
          {reminderEnabled && (
            <select
              value={reminderHour}
              onChange={(e) => saveReminder(true, Number(e.target.value))}
              className="w-full rounded-xl border-0 bg-secondary px-3.5 py-3 text-[0.95rem]"
            >
              {HOURS.map((hour) => (
                <option key={hour} value={hour}>
                  {hour.toString().padStart(2, "0")}:00
                </option>
              ))}
            </select>
          )}
          <Button type="button" variant="ghost" size="sm" className="w-full" onClick={sendTest}>
            Enviar notificación de prueba
          </Button>
        </div>
      )}

      {message && <p className="text-xs text-primary">{message}</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
