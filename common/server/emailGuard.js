/**
 * Check if an email address is allowed to receive emails based on a whitelist.
 * If no whitelist is configured, all emails are allowed.
 *
 * Configure in settings.json:
 *   { "private": { "emailWhitelist": ["allowed@example.com", "test@example.com"] } }
 *
 * @param {string} to - The recipient email address
 * @returns {boolean} - Whether the email should be sent
 */
export const isEmailAllowed = (to) => {
  const whitelist = Meteor.settings?.private?.emailWhitelist;
  if (!whitelist || whitelist.length === 0) return true;
  const address = to.includes('<') ? to.match(/<(.+?)>/)?.[1] : to;
  return whitelist.includes(address?.toLowerCase());
};
