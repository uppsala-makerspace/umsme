import Map from "./Map";

const mockRoomsConfig = {
  floor1: {
    woodshop: {
      name: { en: "Wood Shop", sv: "Träverkstad" },
      description: { en: "Woodworking area", sv: "Träbearbetningsområde" },
      slackChannels: ["#woodshop"],
    },
  },
  floor2: {
    electronics: {
      name: { en: "Electronics Lab", sv: "Elektroniklabb" },
      description: { en: "Soldering and electronics", sv: "Lödning och elektronik" },
      slackChannels: ["#electronics"],
    },
  },
};

const mockSlackChannels = {
  woodshop: "C123",
  electronics: "C456",
};

export default {
  title: "Pages/Map",
  component: Map,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
};

export const Default = {
  args: {
    slackTeam: "T29LX7K7C",
    roomsConfig: mockRoomsConfig,
    slackChannels: mockSlackChannels,
  },
};

export const NoData = {
  args: {
    slackTeam: "T29LX7K7C",
    roomsConfig: null,
    slackChannels: null,
  },
};
