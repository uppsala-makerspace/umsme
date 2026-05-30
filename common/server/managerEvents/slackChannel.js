import { fetch } from "meteor/fetch";

/**
 * Send a manager event to a Slack incoming webhook.
 *
 * @param {{ name: string, webhookUrl: string }} channel
 * @param {{ subject: string, body: string }} payload  Subject and body are
 *   authored in Slack mrkdwn (`*bold*`, `_italic_`, `<url|text>`, backticks).
 */
export async function send(channel, { subject, body }) {
  const text = `*${subject}*\n${body}`;

  // Dev escape hatch: log instead of POSTing when webhookUrl is unset or
  // uses the `console:` scheme. Useful for `npm run dev` without exposing
  // a real channel.
  if (!channel.webhookUrl || channel.webhookUrl.startsWith("console:")) {
    console.log(`[managerEvent] ${channel.name}: ${text}`);
    return;
  }

  const response = await fetch(channel.webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!response.ok) {
    throw new Error(`Slack webhook ${channel.name} returned ${response.status}`);
  }
}
