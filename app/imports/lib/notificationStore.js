const DB_NAME = "notifications";
const DB_VERSION = 1;
const ITEMS_STORE = "items";
const SETTINGS_STORE = "settings";

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

export async function setLanguage(lang) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(SETTINGS_STORE, "readwrite");
    const store = tx.objectStore(SETTINGS_STORE);
    store.put({ key: "userLanguage", value: lang });
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

export async function getAll() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(ITEMS_STORE, "readonly");
    const store = tx.objectStore(ITEMS_STORE);
    const req = store.getAll();
    req.onsuccess = () => {
      db.close();
      const items = req.result || [];
      items.sort((a, b) => b.timestamp - a.timestamp);
      resolve(items);
    };
    req.onerror = () => { db.close(); reject(req.error); };
  });
}

export async function getUnreadCount() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(ITEMS_STORE, "readonly");
    const store = tx.objectStore(ITEMS_STORE);
    const req = store.getAll();
    req.onsuccess = () => {
      db.close();
      const count = (req.result || []).filter((n) => !n.read).length;
      resolve(count);
    };
    req.onerror = () => { db.close(); reject(req.error); };
  });
}

export async function markAsRead(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(ITEMS_STORE, "readwrite");
    const store = tx.objectStore(ITEMS_STORE);
    const req = store.get(id);
    req.onsuccess = () => {
      if (req.result) {
        store.put({ ...req.result, read: true });
      }
    };
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

export async function markAllAsRead() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(ITEMS_STORE, "readwrite");
    const store = tx.objectStore(ITEMS_STORE);
    const req = store.getAll();
    req.onsuccess = () => {
      for (const item of req.result || []) {
        if (!item.read) {
          store.put({ ...item, read: true });
        }
      }
    };
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

export async function deleteNotification(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(ITEMS_STORE, "readwrite");
    const store = tx.objectStore(ITEMS_STORE);
    store.delete(id);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

export async function clearAll() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(ITEMS_STORE, "readwrite");
    const store = tx.objectStore(ITEMS_STORE);
    store.clear();
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}
