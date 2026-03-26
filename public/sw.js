/* eslint-disable no-restricted-globals */
// Service worker for PWA install + Web Push (CRM notifications).

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let data = { title: "CRM", body: "", url: "/dashboard", inquiryId: "" };
  try {
    if (event.data) {
      const parsed = event.data.json();
      data = { ...data, ...parsed };
    }
  } catch (_) {
    // ignore
  }
  const title = data.title || "CRM";
  const options = {
    body: data.body || "",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    data: { url: data.url || "/dashboard" },
    tag: data.inquiryId ? `inquiry-${data.inquiryId}` : "crm-push",
    renotify: true,
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const raw = event.notification.data && event.notification.data.url;
  const path = typeof raw === "string" ? raw : "/dashboard";
  const url = new URL(path, self.location.origin).href;
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windowClients) => {
        for (const client of windowClients) {
          try {
            if (new URL(client.url).origin !== self.location.origin) {
              continue;
            }
          } catch {
            continue;
          }
          if ("focus" in client) {
            return client.focus().then(() => {
              if (
                "navigate" in client &&
                typeof client.navigate === "function"
              ) {
                return client.navigate(url).catch(() => undefined);
              }
            });
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(url).catch(() => undefined);
        }
      })
      .catch(() => undefined),
  );
});
