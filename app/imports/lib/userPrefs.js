const KEY = "default-page";
const ALLOWED = ["home", "unlock", "workshops", "map", "calendar"];
const PATHS = {
  home: "/",
  unlock: "/unlock",
  workshops: "/workshops",
  map: "/map",
  calendar: "/calendar",
};

export const getDefaultPage = () => {
  const v = typeof localStorage !== "undefined" ? localStorage.getItem(KEY) : null;
  return ALLOWED.includes(v) ? v : "home";
};

export const setDefaultPage = (v) => {
  if (typeof localStorage === "undefined") return;
  if (ALLOWED.includes(v)) localStorage.setItem(KEY, v);
};

export const defaultPagePath = (v = getDefaultPage()) => PATHS[v] || "/";
