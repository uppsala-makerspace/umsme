import { useEffect, useRef } from "react";
import { Meteor } from "meteor/meteor";
import i18n from "/imports/i18n";
import { setLanguage } from "/imports/lib/notificationStore";

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return new Uint8Array([...rawData].map((c) => c.charCodeAt(0)));
}

export async function subscribeToPush() {
  const vapidKey = Meteor.settings?.public?.vapidPublicKey;
  if (!vapidKey) return;
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

  const registration = await navigator.serviceWorker.ready;
  let subscription = await registration.pushManager.getSubscription();

  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey),
    });
  }

  const json = subscription.toJSON();
  await Meteor.callAsync("savePushSubscription", {
    endpoint: subscription.endpoint,
    expirationTime: subscription.expirationTime,
    keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
  });

  await setLanguage(i18n.language);
}

export function usePushSetup(enabled = true) {
  const subscribed = useRef(false);

  useEffect(() => {
    if (!enabled) return;
    if (subscribed.current) return;
    if (!Meteor.userId()) return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    if (!Meteor.settings?.public?.vapidPublicKey) return;

    subscribed.current = true;

    const setup = async () => {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") return;
      window.dispatchEvent(new Event("push-permission-granted"));
      await subscribeToPush();
    };

    setup().catch((err) => console.warn("Push setup failed:", err.message));
  }, [enabled, Meteor.userId()]);

  // Sync language changes to IndexedDB
  useEffect(() => {
    const handler = (lang) => {
      setLanguage(lang).catch(() => {});
    };
    i18n.on("languageChanged", handler);
    return () => i18n.off("languageChanged", handler);
  }, []);
}
