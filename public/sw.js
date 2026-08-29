// Service worker mínimo: solo push notifications. No cachea nada (sin soporte offline).
self.addEventListener("push", (event) => {
  let data = { title: "ByteBite", body: "" };
  try {
    if (event.data) data = event.data.json();
  } catch {
    if (event.data) data = { title: "ByteBite", body: event.data.text() };
  }

  event.waitUntil(
    self.registration.showNotification(data.title || "ByteBite", {
      body: data.body || "",
      icon: "/icons/favicon.png",
      badge: "/icons/favicon.png",
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clientsArr) => {
      const existing = clientsArr.find((c) => c.url.includes(self.location.origin));
      if (existing) return existing.focus();
      return self.clients.openWindow("/dashboard");
    }),
  );
});
