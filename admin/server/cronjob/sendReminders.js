import { Meteor } from 'meteor/meteor';
import { Email } from 'meteor/email';
import { SyncedCron } from 'meteor/chatra:synced-cron';
import { Members } from '/imports/common/collections/members';
import { Messages } from '/imports/common/collections/messages';
import { findBestTemplate, messageData } from '/imports/common/lib/message';
import { isEmailAllowed } from '/imports/common/server/emailGuard';
import { pushMessage } from '/imports/common/server/push';

// Per-template dedup horizon: skip if the same template was used recently
// (handled inside sendReminder via the Messages collection).
const RECENT_REMINDER_DAYS = 30;

// Same-day guard against double-firing within a single cron-run window.
// Kept narrow on purpose — wider gives a quarterly-lab reminder false power
// to suppress an upcoming yearly-membership reminder for the same member.
const SAME_DAY_GUARD_DAYS = 1;

// Maximum days remaining on memberend / labend that puts a member in the
// cron's candidate set. Anyone with <= this many days left (and not already
// expired) is eligible; dedup ensures only one reminder per renewal cycle.
const REMINDER_HORIZON_DAYS = 14;

const reminderHour = () => Meteor.settings?.reminderCron?.hour ?? 9;
const reminderMinute = () => Meteor.settings?.reminderCron?.minute ?? 0;

const fromAddress = () => {
  const f = Meteor.settings?.noreply;
  if (Array.isArray(f)) return f[0];
  return f || 'no-reply@uppsalamakerspace.se';
};

const iso = (d) => (d instanceof Date ? d.toISOString() : String(d));

export async function runReminderJob() {
  console.log(`[Reminder cron] Job invoked at ${new Date().toISOString()}; deliverMails=${Meteor.settings.deliverMails}`);
  if (!Meteor.settings.deliverMails) {
    return 'Reminder cron skipped: deliverMails is false.';
  }

  const now = new Date();
  const reminderHorizon = new Date(now);
  reminderHorizon.setDate(reminderHorizon.getDate() + REMINDER_HORIZON_DAYS);
  const recentCutoff = new Date(now);
  recentCutoff.setDate(recentCutoff.getDate() - RECENT_REMINDER_DAYS);
  const sameDayCutoff = new Date(now);
  sameDayCutoff.setDate(sameDayCutoff.getDate() - SAME_DAY_GUARD_DAYS);

  console.log(`[Reminder cron] Cron-trigger horizon: member|lab in (${iso(now)}, ${iso(reminderHorizon)}]`);
  console.log(`[Reminder cron] Cutoffs: per-template=${iso(recentCutoff)} (${RECENT_REMINDER_DAYS}d), same-day=${iso(sameDayCutoff)} (${SAME_DAY_GUARD_DAYS}d)`);

  const candidates = await Members.find({
    infamily: { $exists: false },
    $or: [
      { member: { $gt: now, $lte: reminderHorizon } },
      { lab:    { $gt: now, $lte: reminderHorizon } },
    ],
  }).fetchAsync();

  let sent = 0;
  let skippedRecent = 0;
  let failed = 0;

  for (const mb of candidates) {
    if (mb.reminder && mb.reminder > sameDayCutoff) {
      skippedRecent++;
      continue;
    }
    const status = await sendReminder(mb, now, reminderHorizon, recentCutoff);
    if (status === 'sent') sent++;
    else if (status === 'skipped') skippedRecent++;
    else failed++;
  }

  const summary = `Reminders: ${sent} sent, ${skippedRecent} skipped (recent), ${failed} failed; ${candidates.length} in 14-day horizon.`;
  console.log(`[Reminder cron] ${summary}`);
  return summary;
}

if (Meteor.isServer) {
  SyncedCron.add({
    name: 'Send membership reminder mails',
    schedule(parser) {
      return parser.recur().on(reminderHour()).hour().on(reminderMinute()).minute();
    },
    job: runReminderJob,
  });
}

// Returns one of: 'sent', 'skipped' (a reminder using this same template was sent recently),
// or 'failed' (template missing, no email, blocked by whitelist, or exception).
async function sendReminder(mb, now, reminderHorizon, recentCutoff) {
  try {
    const memberDue = mb.member && mb.member > now && mb.member <= reminderHorizon;
    const labDue    = mb.lab    && mb.lab    > now && mb.lab    <= reminderHorizon;
    const membershiptype = (memberDue && labDue) ? 'labandmember' : (memberDue ? 'member' : 'lab');
    const membertype = mb.family === true ? 'family' : (mb.youth === true ? 'youth' : 'normal');

    const tpl = await findBestTemplate({ type: 'reminder', membershiptype, membertype });
    if (!tpl) {
      console.log(`[Reminder cron] No template for ${membershiptype}/${membertype} (member ${mb._id}); skipping.`);
      return 'failed';
    }

    // Skip if this same template was already used to remind this member recently.
    // Per-template (rather than any-reminder) so a quarterly-lab reminder doesn't
    // suppress an upcoming yearly-membership reminder, and vice versa.
    const recentMsg = await Messages.findOneAsync({
      member: mb._id,
      type: 'reminder',
      template: tpl._id,
      senddate: { $gt: recentCutoff },
    });
    if (recentMsg) {
      console.log(`[Reminder cron] Member ${mb._id} already got a reminder using template ${tpl._id} recently; skipping.`);
      return 'skipped';
    }

    const data = await messageData(mb._id, tpl._id);
    if (!data.to) {
      console.log(`[Reminder cron] Member ${mb._id} has no email; skipping.`);
      return 'failed';
    }
    if (!isEmailAllowed(data.to)) {
      console.log(`[Reminder cron] ${data.to} blocked by email whitelist; skipping.`);
      return 'failed';
    }

    await Email.sendAsync({
      to: data.to,
      from: fromAddress(),
      subject: data.subject,
      text: data.messagetext,
    });

    const messageId = await Messages.insertAsync({
      template: tpl._id,
      member: mb._id,
      type: 'reminder',
      to: data.to,
      subject: data.subject,
      senddate: new Date(),
      messagetext: data.messagetext,
    });

    await Members.updateAsync(mb._id, { $set: { reminder: new Date() } });

    try {
      await pushMessage(messageId);
    } catch (err) {
      console.error(`[Reminder cron] Push failed for member ${mb._id}:`, err);
    }

    console.log(`[Reminder cron] Sent ${membershiptype}/${membertype} reminder to ${data.to} (member ${mb._id}).`);
    return 'sent';
  } catch (err) {
    console.error(`[Reminder cron] Failed for member ${mb._id}:`, err);
    return 'failed';
  }
}
