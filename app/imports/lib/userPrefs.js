const KEY = "default-page";
const ALLOWED = ["home", "unlock", "workshops", "map", "calendar"];
const PATHS = {
  home: "/",
  unlock: "/unlock",
  workshops: "/workshops",
  map: "/map",
  calendar: "/calendar",
};

// The calendar of events was once the activities page, and before that the
// Google calendar; both were stored under their names.
const RENAMED = { activities: "calendar" };

export const getDefaultPage = () => {
  const stored = typeof localStorage !== "undefined" ? localStorage.getItem(KEY) : null;
  const v = RENAMED[stored] || stored;
  return ALLOWED.includes(v) ? v : "home";
};

export const setDefaultPage = (v) => {
  if (typeof localStorage === "undefined") return;
  if (ALLOWED.includes(v)) localStorage.setItem(KEY, v);
};

export const defaultPagePath = (v = getDefaultPage()) => PATHS[v] || "/";
