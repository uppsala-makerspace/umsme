import webpush from "web-push";
import { PushSubs } from "/imports/common/collections/pushSubs";
import { Members } from "/imports/common/collections/members";
import { Messages } from "/imports/common/collections/messages";
import { Announcements } from "/imports/common/collections/announcements";
import { NotificationCategory } from "/imports/common/lib/notificationCategories";

const PUSH_BODY_MAX = 140;

const truncate = (text, max = PUSH_BODY_MAX) => {
  if (!text || text.length <= max) return text;
  return text.slice(0, max - 1).trimEnd() + "…";
};

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

/**
 * Build a bilingual payload and send push to the member if they have:
 *  - opted in (notificationPrefs[category] !== false)
 *  - a verified email
 *  - at least one push subscription
 *
 * English falls back to Swedish when not provided.
 * Fails silently — errors are logged but not thrown.
 */
const sendCategoryPush = async (member, category, id, subjectSv, bodySv, subjectEn, bodyEn) => {
  try {
    if (!member) return;
    if (member.notificationPrefs?.[category] === false) return;
    if (!member.email) return;

    const user = await Meteor.users.findOneAsync({ "emails.address": member.email });
    if (!user) return;

    const subs = await PushSubs.find({ userId: user._id }).fetchAsync();
    if (subs.length === 0) return;

    const payload = {
      title: { sv: subjectSv, en: subjectEn || subjectSv },
      body: { sv: truncate(bodySv), en: truncate(bodyEn) || truncate(bodySv) },
      category,
      timestamp: Date.now(),
    };
    if (id) payload.id = id;

    await sendPushToSubscriptions(subs, payload);
  } catch (err) {
    console.error(`Failed to send ${category} push:`, err);
  }
};

/**
 * Push a private-message notification.
 * Looks up the Messages document and recipient member by id.
 *
 * @param {string} messageId - The Messages document _id
 */
export const pushMessage = async (messageId) => {
  const message = await Messages.findOneAsync(messageId);
  if (!message?.member) return;
  const member = await Members.findOneAsync(message.member);
  return sendCategoryPush(
    member,
    NotificationCategory.privateMessages,
    messageId,
    message.subject,
    message.messagetext
  );
};

/**
 * Push an announcement notification to a specific member.
 * Looks up the announcement by id.
 *
 * @param {Object} member - The recipient member object
 * @param {string} announcementId - The Announcements document _id
 */
export const pushAnnouncement = async (member, announcementId) => {
  const announcement = await Announcements.findOneAsync(announcementId);
  if (!announcement) return;
  return sendCategoryPush(
    member,
    NotificationCategory.announcements,
    announcementId,
    announcement.subjectSv,
    announcement.bodySv,
    announcement.subjectEn,
    announcement.bodyEn
  );
};
