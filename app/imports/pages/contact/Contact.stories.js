import Contact from "./Contact";

const mockSlackConfig = {
  team: "T29LX7K7C",
  channels: [
    { name: "general", id: "C29LE8ZTQ" },
    { name: "lokalen", id: "C29UMTY9Z" },
    { name: "fråga-styrelsen", id: "C02FBP7UQTG" },
    { name: "random", id: "C29LM3D6Z" },
  ],
};

export default {
  title: "Pages/Contact",
  component: Contact,
  args: {
    slackConfig: mockSlackConfig,
  },
};

export const Default = {};

export const NoSlackConfig = {
  args: {
    slackConfig: undefined,
  },
};
