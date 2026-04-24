/**
 * Central list of notification categories.
 *
 * Each entry:
 *  - key: stored in member.notificationPrefs[key] as a boolean, also used as
 *         the category string in push notification payloads
 *  - defaultValue: default if no explicit value is set on the member
 *  - labelKey: i18n key for the UI label
 *  - adminOnly: only shown in the UI for admins (optional)
 */
export const NOTIFICATION_CATEGORIES = [
  { key: "membershipExpiry", defaultValue: true, labelKey: "notifMembershipExpiry" },
  { key: "privateMessages",  defaultValue: true, labelKey: "notifPrivateMessages" },
  { key: "announcements",    defaultValue: true, labelKey: "notifAnnouncements" },
  { key: "testNotification", defaultValue: false, labelKey: "notifTestNotification", adminOnly: true },
];

/**
 * String constants for push notification categories.
 * Use these instead of string literals when building push payloads.
 */
export const NotificationCategory = Object.fromEntries(
  NOTIFICATION_CATEGORIES.map((c) => [c.key, c.key])
);

/**
 * Return default notification preferences object built from NOTIFICATION_CATEGORIES.
 */
export const getDefaultNotificationPrefs = () =>
  Object.fromEntries(NOTIFICATION_CATEGORIES.map((c) => [c.key, c.defaultValue]));

/**
 * Merge stored preferences over defaults.
 */
export const applyDefaults = (saved) => ({
  ...getDefaultNotificationPrefs(),
  ...(saved || {}),
});
