import webpush from "web-push";
import { PushSubs } from "/imports/common/collections/pushSubs";

/**
 * Initialize web-push with VAPID keys from settings.
 * Call once from each app's startup.
 */
export const initPush = () => {
  if (Meteor.settings.public?.vapidPublicKey && Meteor.settings.private?.vapidPrivateKey) {
    webpush.setVapidDetails(
      "mailto:admin@uppsalamakerspace.se",
      Meteor.settings.public.vapidPublicKey,
      Meteor.settings.private.vapidPrivateKey
    );
    return true;
  }
  console.warn("VAPID keys not configured, push notifications disabled.");
  return false;
};

/**
 * Send a push notification payload to a list of subscriptions.
 * Auto-cleans up 410/404 (gone) subscriptions.
 *
 * @param {Array} subs - Array of push subscription documents from PushSubs
 * @param {Object} payload - Notification payload (will be JSON-stringified)
 */
export const sendPushToSubscriptions = async (subs, payload) => {
  const payloadStr = JSON.stringify(payload);
  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          expirationTime: sub.expirationTime,
          keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth },
        },
        payloadStr
      );
    } catch (err) {
      if (err.statusCode === 410 || err.statusCode === 404) {
        await PushSubs.removeAsync({ endpoint: sub.endpoint });
      } else {
        console.error("Push error to", sub.endpoint, err.statusCode || err.message);
      }
    }
  }
};
