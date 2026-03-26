/* eslint-disable no-restricted-globals */
// Service worker for PWA install + Web Push (CRM notifications).

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

function absoluteAssetPath(path) {
  return new URL(path, self.location.origin).href;
}

self.addEventListener("push", (event) => {
  const iconUrl = absoluteAssetPath("/icons/icon-192.png");
  event.waitUntil(
    (async () => {
      let data = { title: "CRM", body: "", url: "/dashboard", inquiryId: "" };
      try {
        if (event.data) {
          const text = await event.data.text();
          if (text) Object.assign(data, JSON.parse(text));
        }
      } catch (_) {
        /* keep defaults */
      }
      const title = data.title || "CRM";
      const options = {
        body: data.body || "",
        icon: iconUrl,
        badge: iconUrl,
        data: { url: data.url || "/dashboard" },
        tag: data.inquiryId ? `inquiry-${data.inquiryId}` : "crm-push",
        renotify: true,
      };
      await self.registration.showNotification(title, options);
    })(),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const raw = event.notification.data && event.notification.data.url;
  const path = typeof raw === "string" ? raw : "/dashboard";
  const url = new URL(path, self.location.origin).href;
  event.waitUntil(
    (async () => {
      const list = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      for (const client of list) {
        if (!client.url.startsWith(self.location.origin)) continue;
        if ("navigate" in client && typeof client.navigate === "function") {
          try {
            await client.navigate(url);
            return client.focus();
          } catch (_) {
            /* Safari / older engines: fall through to openWindow */
          }
        }
      }
      return self.clients.openWindow(url).catch(() => undefined);
    })(),
  );
});
