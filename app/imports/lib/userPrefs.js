const KEY = "default-page";
const ALLOWED = ["home", "unlock", "workshops", "map", "activities"];
const PATHS = {
  home: "/",
  unlock: "/unlock",
  workshops: "/workshops",
  map: "/map",
  activities: "/activities",
};

// Activities took the calendar's place in the bottom navigation, and as a
// start page too.
const RENAMED = { calendar: "activities" };

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
