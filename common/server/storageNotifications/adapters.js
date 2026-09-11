import { Meteor } from 'meteor/meteor';
import { Email } from 'meteor/email';

export const disabledSmsAdapter = {
  available: false,
  async send() { throw new Error('SMS delivery is disabled'); },
};

export const meteorEmailAdapter = {
  available: true,
  send: (message) => Email.sendAsync(emailOptionsForStorageMessage(message)),
};

export const emailOptionsForStorageMessage = (message) => ({
  to: message.to, from: message.from, replyTo: message.replyTo,
  subject: message.subject, text: message.text,
  messageId: message.messageId,
  headers: { 'X-Storage-Delivery-ID': message.idempotencyKey },
});

export const webhookSmsAdapter = ({ url, token }) => ({
  available: Boolean(url),
  async send(message) {
    if (!url) throw new Error('SMS webhook URL is missing');
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'idempotency-key': message.idempotencyKey,
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ to: message.to, text: message.text }),
      signal: message.signal,
    });
    if (!response.ok) throw new Error(`SMS provider returned HTTP ${response.status}`);
    const result = await response.json().catch(() => ({}));
    return { providerId: String(result.id || result.messageId || message.idempotencyKey) };
  },
});

export const storageNotificationAdaptersFromSettings = () => {
  const sms = Meteor.settings?.private?.storageNotifications?.sms || { provider: 'disabled' };
  return {
    email: { ...meteorEmailAdapter, available: Meteor.settings?.deliverMails === true },
    sms: sms.provider === 'webhook' ? webhookSmsAdapter(sms) : disabledSmsAdapter,
  };
};
