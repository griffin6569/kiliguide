const CACHE = "kiliguide-v1";
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", (event) => { if (event.request.method === "GET" && new URL(event.request.url).origin === self.location.origin) event.respondWith(caches.match(event.request).then((hit) => hit || fetch(event.request))); });
self.addEventListener("push", (event) => { const data = event.data ? event.data.json() : {}; event.waitUntil(self.registration.showNotification(data.title || "KiliGuide", { body: data.body || "You have a campus update.", icon: "/icon.svg", badge: "/icon.svg", data: { url: data.url || "/notifications" }, tag: data.tag || "kiliguide-update", renotify: true })); });
self.addEventListener("notificationclick", (event) => { event.notification.close(); event.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => { const existing = clients.find((client) => client.url.includes(event.notification.data.url)); return existing ? existing.focus() : self.clients.openWindow(event.notification.data.url); })); });
