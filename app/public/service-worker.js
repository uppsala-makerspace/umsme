/// <reference lib="webworker" />

self.addEventListener("install", (event) => {
  console.log("Service Worker installing...");
  self.skipWaiting(); //
});

self.addEventListener("activate", (event) => {
  console.log("Service Worker activating...");
});

self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request));
});

self.addEventListener("push", (event) => {
  console.log("Push mottagen i service worker");
  // Standardvärden om inget payload finns
  let data = { title: "Ny notis", body: "Du har fått en push-notis!" };

  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    // icon: '/icons/icon-192x192.png', // Byt ut mot din ikon
    //  badge: '/icons/icon-72x72.png',  // Liten ikon för notiscentret
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});
