import Unlock from "/imports/pages/unlock/Unlock";
import { withLayout } from "./decorators";
import { dates, doorsList, userAcrossTown } from "./fixtures";

export default {
  title: "Tutorial/Doors",
  component: Unlock,
  decorators: [withLayout],
};

// Filename: doors-{lang}.png — the three-door view with distance labels
// (user is across town, so the tiles are grey and the help panel shows).
export const Doors = {
  args: {
    doors: doorsList,
    opening: { outerDoor: false, upperFloor: false, lowerFloor: false },
    onOpenDoor: () => {},
    registered: true,
    liabilityDate: dates.liabilityApprovedDate,
    liabilityOutdated: false,
    locationPermission: "granted",
    userPosition: userAcrossTown,
    proximityRange: 100,
    isAdmin: false,
  },
  parameters: { tutorial: { path: "/unlock", file: "doors" } },
};
