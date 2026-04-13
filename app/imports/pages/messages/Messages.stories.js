import Messages from "./Messages";

const now = new Date();
const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
const lastMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

const defaultItems = [
  {
    kind: "announcement",
    _id: "a1",
    subject: "Sommarhälsning från styrelsen",
    date: now,
    type: "newsletter",
  },
  {
    kind: "message",
    _id: "m1",
    subject: "Påminnelse om medlemsavgift",
    date: yesterday,
    type: "reminder",
  },
  {
    kind: "announcement",
    _id: "a2",
    subject: "Stängt under helgen",
    date: lastWeek,
    type: "information",
  },
  {
    kind: "message",
    _id: "m2",
    subject: "Välkommen till Uppsala MakerSpace",
    date: lastMonth,
    type: "welcome",
  },
];

export default {
  title: "Pages/Messages",
  component: Messages,
};

export const Loading = {
  args: {
    loading: true,
    items: [],
  },
};

export const Empty = {
  args: {
    loading: false,
    items: [],
  },
};

export const WithItems = {
  args: {
    loading: false,
    items: defaultItems,
    lastSeen: lastMonth,
  },
};

export const AllRead = {
  args: {
    loading: false,
    items: defaultItems,
    lastSeen: now,
  },
};

export const AllNew = {
  args: {
    loading: false,
    items: defaultItems,
    lastSeen: null,
  },
};

export const OnlyAnnouncements = {
  args: {
    loading: false,
    items: defaultItems.filter((i) => i.kind === "announcement"),
    lastSeen: lastMonth,
  },
};

export const OnlyPrivateMessages = {
  args: {
    loading: false,
    items: defaultItems.filter((i) => i.kind === "message"),
    lastSeen: lastMonth,
  },
};
