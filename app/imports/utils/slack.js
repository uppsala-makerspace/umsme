/**
 * Gets the Slack channel configuration by name.
 * @param {string} channelName - The name of the channel (without #)
 * @param {{ team: string, channels: Array<{ name: string, id: string }> }} slackConfig - The slack configuration
 * @returns {{ name: string, id: string } | undefined} The channel config or undefined if not found
 */
export const getSlackChannel = (channelName, slackConfig) => {
  if (!slackConfig?.channels) {
    return undefined;
  }
  return slackConfig.channels.find((channel) => channel.name === channelName);
};

/**
 * Gets the Slack deep link URL for a channel.
 * @param {string} channelName - The name of the channel (without #)
 * @param {{ team: string, channels: Array<{ name: string, id: string }> }} slackConfig - The slack configuration
 * @returns {string | undefined} The slack:// URL or undefined if channel not found
 */
export const getSlackChannelUrl = (channelName, slackConfig) => {
  if (!slackConfig?.team) {
    return undefined;
  }
  const channel = getSlackChannel(channelName, slackConfig);
  if (!channel) {
    return undefined;
  }
  return `slack://channel?team=${slackConfig.team}&id=${channel.id}`;
};
