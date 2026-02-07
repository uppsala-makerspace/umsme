import { fn } from "storybook/test";
import Tabs from "./Tabs";

export default {
  title: "Components/Tabs",
  component: Tabs,
  tags: ["autodocs"],
  args: {
    onTabChange: fn(),
  },
  decorators: [
    (Story) => (
      <div style={{ width: "400px" }}>
        <Story />
      </div>
    ),
  ],
};

export const TwoTabs = {
  args: {
    tabs: [
      { key: "upcoming", label: "Upcoming Events" },
      { key: "past", label: "Past Events" },
    ],
    activeTab: "upcoming",
  },
};

export const SecondActive = {
  args: {
    tabs: [
      { key: "upcoming", label: "Upcoming Events" },
      { key: "past", label: "Past Events" },
    ],
    activeTab: "past",
  },
};

export const WithBadge = {
  args: {
    tabs: [
      { key: "my", label: "My Certificates" },
      { key: "requests", label: "Requests", badge: 3 },
    ],
    activeTab: "my",
  },
};

export const WithZeroBadge = {
  args: {
    tabs: [
      { key: "my", label: "My Certificates" },
      { key: "requests", label: "Requests", badge: 0 },
    ],
    activeTab: "my",
  },
};
