import Contact from "./Contact";

const mockSlackTeam = "T29LX7K7C";

const mockSlackChannelIds = {
  "general": "C29LE8ZTQ",
  "lokalen": "C29UMTY9Z",
  "fråga-styrelsen": "C02FBP7UQTG",
  "random": "C29LM3D6Z",
};

export default {
  title: "Pages/Contact",
  component: Contact,
  args: {
    slackTeam: mockSlackTeam,
    slackChannelIds: mockSlackChannelIds,
  },
};

export const Default = {};

export const NoSlackConfig = {
  args: {
    slackTeam: undefined,
    slackChannelIds: undefined,
  },
};
