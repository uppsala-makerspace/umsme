/**
 * Gets the Slack deep link URL for a channel.
 * @param {string} channelName - The name of the channel (without #)
 * @param {string} teamId - The Slack team ID
 * @param {Object<string, string>} channelIds - Mapping of channel names to IDs (from slack-channels.json)
 * @returns {string | undefined} The slack:// URL or undefined if channel not found
 */
export const getSlackChannelUrl = (channelName, teamId, channelIds) => {
  if (!teamId || !channelIds) {
    return undefined;
  }
  const channelId = channelIds[channelName];
  if (!channelId) {
    return undefined;
  }
  return `slack://channel?team=${teamId}&id=${channelId}`;
};
