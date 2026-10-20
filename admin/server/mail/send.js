import { Meteor } from 'meteor/meteor';
import { Email } from 'meteor/email';
import { isEmailAllowed } from '/imports/common/server/emailGuard';

/**
 * Send one mail from admin: refused unless settings.deliverMails is set,
 * skipped (and logged) for an address the recipient whitelist leaves out.
 * From the first of settings.from unless given.
 */
export const sendMail = async ({ to, subject, text, from, html }) => {
  if (!Meteor.settings.deliverMails) {
    throw new Meteor.Error(`Flag deliverMail in settings not set, cannot send mail to ${to}`);
  }
  if (!isEmailAllowed(to)) {
    console.log(`Email to ${to} blocked by whitelist`);
    return;
  }
  const f = Meteor.settings.from;
  try {
    await Email.sendAsync({ to, from: from || (Array.isArray(f) ? f[0] : f), subject, text, ...(html ? { html } : {}) });
    console.log(`Sent mail to ${to}`);
  } catch (err) {
    const mesg = `Failed sending mail: ${err}`;
    console.log(mesg);
    throw new Meteor.Error(mesg);
  }
};
