/// <reference lib="webworker" />

const DB_NAME = "notifications";
const DB_VERSION = 1;
const ITEMS_STORE = "items";
const SETTINGS_STORE = "settings";
const CHANNEL_NAME = "notifications";

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(ITEMS_STORE)) {
        db.createObjectStore(ITEMS_STORE, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(SETTINGS_STORE)) {
        db.createObjectStore(SETTINGS_STORE, { keyPath: "key" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function dbGet(db, storeName, key) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readonly");
    const store = tx.objectStore(storeName);
    const req = store.get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function dbPut(db, storeName, value) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    const store = tx.objectStore(storeName);
    const req = store.put(value);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request));
});

self.addEventListener("push", (event) => {
  const work = async () => {
    let data = { title: "Notification", body: "" };

    if (event.data) {
      try {
        data = event.data.json();
      } catch (e) {
        data.body = event.data.text();
      }
    }

    // Resolve bilingual payload
    let lang = "sv";
    try {
      const db = await openDB();
      const setting = await dbGet(db, SETTINGS_STORE, "userLanguage");
      if (setting?.value) lang = setting.value;
      db.close();
    } catch (e) {
      // Fallback to Swedish
    }

    const title =
      typeof data.title === "object" ? data.title[lang] || data.title.sv || data.title.en : data.title;
    const body =
      typeof data.body === "object" ? data.body[lang] || data.body.sv || data.body.en : data.body;

    const timestamp = data.timestamp || Date.now();

    // Store both languages in IndexedDB so the app can resolve at render time
    const titleObj = typeof data.title === "object" ? data.title : { sv: data.title, en: data.title };
    const bodyObj = typeof data.body === "object" ? data.body : { sv: data.body, en: data.body };

    // Write to IndexedDB
    try {
      const db = await openDB();
      await dbPut(db, ITEMS_STORE, {
        id: timestamp,
        title: titleObj,
        body: bodyObj,
        category: data.category || "general",
        timestamp,
        read: false,
      });
      db.close();
    } catch (e) {
      // Continue even if DB write fails
    }

    // Notify the app via BroadcastChannel
    try {
      const channel = new BroadcastChannel(CHANNEL_NAME);
      channel.postMessage({ type: "NEW_NOTIFICATION" });
      channel.close();
    } catch (e) {
      // BroadcastChannel may not be supported
    }

    await self.registration.showNotification(title, {
      body,
      icon: "/icons/icon-192x192-v3.png",
      badge: "/icons/badge-96x96.png",
    });
  };

  event.waitUntil(work());
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes("/") && "focus" in client) {
          client.navigate("/notifications");
          return client.focus();
        }
      }
      return self.clients.openWindow("/notifications");
    })
  );
});
