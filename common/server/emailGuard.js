import { isRecipientAllowed } from './recipientGuard';

/**
 * Whether an email may be sent to this address. Kept as the name the mail
 * paths already use; the rule itself is the shared recipient whitelist, which
 * also governs push — see recipientGuard.js.
 *
 * @param {string} to - The recipient email address
 * @returns {boolean} - Whether the email should be sent
 */
export const isEmailAllowed = (to) => isRecipientAllowed(to);
