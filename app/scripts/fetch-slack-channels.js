#!/usr/bin/env node

/**
 * Fetches all Slack channel names and IDs from a workspace
 * and writes the mapping to public/data/slack-channels.json
 *
 * Usage: node scripts/fetch-slack-channels.js
 *
 * Requires settings.json with:
 *   private.slack.botToken: "xoxb-your-bot-token"
 *
 * The bot token needs the following OAuth scopes:
 *   - channels:read (for public channels)
 *   - groups:read (for private channels, optional)
 */

const fs = require("fs");
const path = require("path");

const SETTINGS_PATH = path.join(__dirname, "..", "settings.json");
const OUTPUT_PATH = path.join(__dirname, "..", "public", "data", "slack-channels.json");

async function fetchChannels(token, cursor = null) {
  const params = new URLSearchParams({
    types: "public_channel",
    limit: "1000",
    exclude_archived: "true",
  });

  if (cursor) {
    params.append("cursor", cursor);
  }
  console.log("HEPP "+ `https://slack.com/api/conversations.list?${params}`)
  const response = await fetch(`https://slack.com/api/conversations.list?${params}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await response.json();

  if (!data.ok) {
    throw new Error(`Slack API error: ${data.error}`);
  }

  return data;
}

async function getAllChannels(token) {
  const allChannels = [];
  let cursor = null;

  do {
    const data = await fetchChannels(token, cursor);
    allChannels.push(...data.channels);
    cursor = data.response_metadata?.next_cursor || null;
  } while (cursor);

  return allChannels;
}

async function main() {
  // Read settings.json
  if (!fs.existsSync(SETTINGS_PATH)) {
    console.error("Error: settings.json not found");
    console.error("Make sure you have a settings.json file with private.slack.botToken configured");
    process.exit(1);
  }

  const settings = JSON.parse(fs.readFileSync(SETTINGS_PATH, "utf8"));
  const token = settings.private?.slack?.botToken;

  if (!token) {
    console.error("Error: No Slack bot token found in settings.json");
    console.error("Add private.slack.botToken to your settings.json file");
    console.error("");
    console.error("To get a bot token:");
    console.error("1. Go to https://api.slack.com/apps");
    console.error("2. Create or select your app");
    console.error("3. Go to OAuth & Permissions");
    console.error("4. Add 'channels:read' scope (and 'groups:read' for private channels)");
    console.error("5. Install the app to your workspace");
    console.error("6. Copy the Bot User OAuth Token (starts with xoxb-)");
    process.exit(1);
  }

  console.log("Fetching Slack channels...");

  try {
    const channels = await getAllChannels(token);

    // Create mapping: name -> id
    const mapping = {};
    channels.forEach((channel) => {
      mapping[channel.name] = channel.id;
    });

    // Sort by name for readability
    const sortedMapping = Object.keys(mapping)
      .sort()
      .reduce((obj, key) => {
        obj[key] = mapping[key];
        return obj;
      }, {});

    // Ensure output directory exists
    const outputDir = path.dirname(OUTPUT_PATH);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Write to file
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(sortedMapping, null, 2) + "\n");

    console.log(`Found ${channels.length} channels`);
    console.log(`Mapping written to: ${OUTPUT_PATH}`);
  } catch (error) {
    console.error("Error fetching channels:", error.message);
    process.exit(1);
  }
}

main();
