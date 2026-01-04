import { Meteor } from "meteor/meteor";

/**
 * Gets the Slack channel configuration by name.
 * @param {string} channelName - The name of the channel (without #)
 * @returns {{ name: string, id: string } | undefined} The channel config or undefined if not found
 */
export const getSlackChannel = (channelName) => {
  const slack = Meteor.settings?.public?.slack;
  if (!slack?.channels) {
    return undefined;
  }
  return slack.channels.find((channel) => channel.name === channelName);
};

/**
 * Gets the Slack deep link URL for a channel.
 * @param {string} channelName - The name of the channel (without #)
 * @returns {string | undefined} The slack:// URL or undefined if channel not found
 */
export const getSlackChannelUrl = (channelName) => {
  const slack = Meteor.settings?.public?.slack;
  if (!slack?.team) {
    return undefined;
  }
  const channel = getSlackChannel(channelName);
  if (!channel) {
    return undefined;
  }
  return `slack://channel?team=${slack.team}&id=${channel.id}`;
};
