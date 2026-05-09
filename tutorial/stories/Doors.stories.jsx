import Unlock from "/imports/pages/unlock/Unlock";
import { withLayout } from "./decorators";
import { dates, doorsList, userFarAway } from "./fixtures";

export default {
  title: "Tutorial/Doors",
  component: Unlock,
  decorators: [withLayout],
};

// Filename: doors-{lang}.png — the three-door view with distance label
// (user is far away from the makerspace coords).
export const Doors = {
  args: {
    doors: doorsList,
    opening: { outerDoor: false, upperFloor: false, lowerFloor: false },
    onOpenDoor: () => {},
    registered: true,
    liabilityDate: dates.liabilityApprovedDate,
    liabilityOutdated: false,
    locationPermission: "granted",
    userPosition: userFarAway,
    proximityRange: 100,
    isAdmin: false,
  },
  parameters: { tutorial: { path: "/unlock", file: "doors" } },
};
