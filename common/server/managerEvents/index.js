import { Meteor } from "meteor/meteor";
import * as slackChannel from "./slackChannel";

/**
 * Catalogue of manager-facing operational events. Add new entries here
 * (kebab-case-ish strings) and reference them by name in each app's
 * `Meteor.settings.private.managerEvents.channels[*].subscriptions`.
 *
 * These are distinct from PWA push notifications (see common/server/push.js):
 * push notifications go to members on their phones; manager events go to
 * the people running the org via ops channels (Slack today, more later).
 */
export const ManagerEventType = {
  NEW_MEMBER_PAYMENT: "newMemberPayment",
  MEMBERSHIP_RENEWED: "membershipRenewed",
  QUARTERLY_LAB_PAYMENT: "quarterlyLabPayment",
  BOX_REQUEST: "boxRequest",
};

const CHANNEL_ADAPTERS = {
  slack: slackChannel,
};

/**
 * Publish a manager event. Looks up subscribed channels in settings and
 * fans out; per-channel failures are logged but never thrown so a Slack
 * outage can't break the flow that triggered the event.
 *
 * @param {string} type     Value from `ManagerEventType`.
 * @param {{ subject: string, body: string }} payload
 *   Both fields are authored in markup that the channel adapter
 *   understands (Slack mrkdwn today).
 */
export async function publishManagerEvent(type, { subject, body }) {
  const channels = Meteor.settings?.private?.managerEvents?.channels || [];
  const matched = channels.filter((c) => c.subscriptions?.includes(type));

  if (matched.length === 0) {
    console.debug(`[managerEvent] ${type}: no channel subscribed`);
    return;
  }

  await Promise.all(matched.map(async (channel) => {
    const adapter = CHANNEL_ADAPTERS[channel.type];
    if (!adapter) {
      console.error(
        `[managerEvent] ${channel.name}: unknown channel type "${channel.type}"`
      );
      return;
    }
    try {
      await adapter.send(channel, { subject, body });
    } catch (err) {
      console.error(
        `[managerEvent] ${channel.name} (${type}) failed:`,
        err
      );
    }
  }));
}
