import Unlock from "./Unlock";

const defaultDoors = [
  { id: "outerDoor", labelKey: "outerDoor" },
  { id: "upperFloor", labelKey: "upperFloor" },
  { id: "lowerFloor", labelKey: "lowerFloor" },
];

const liabilityDate = new Date("2024-01-15");
const oldLiabilityDate = new Date("2023-06-01");

export default {
  title: "Pages/Unlock",
  component: Unlock,
};

export const Default = {
  args: {
    doors: defaultDoors,
    opening: {
      outerDoor: false,
      upperFloor: false,
      lowerFloor: false,
    },
    onOpenDoor: (door) => console.log(`Opening ${door}`),
    liabilityDate,
    liabilityOutdated: false,
  },
};

export const OuterDoorOpening = {
  args: {
    doors: defaultDoors,
    opening: {
      outerDoor: true,
      upperFloor: false,
      lowerFloor: false,
    },
    onOpenDoor: (door) => console.log(`Opening ${door}`),
    liabilityDate,
    liabilityOutdated: false,
  },
};

export const SingleDoor = {
  args: {
    doors: [{ id: "mainEntrance", labelKey: "outerDoor" }],
    opening: {
      mainEntrance: false,
    },
    onOpenDoor: (door) => console.log(`Opening ${door}`),
    liabilityDate,
    liabilityOutdated: false,
  },
};

export const NoDoors = {
  args: {
    doors: [],
    opening: {},
    onOpenDoor: (door) => console.log(`Opening ${door}`),
    liabilityDate,
    liabilityOutdated: false,
  },
};

export const LiabilityNotApproved = {
  args: {
    doors: defaultDoors,
    opening: {
      outerDoor: false,
      upperFloor: false,
      lowerFloor: false,
    },
    onOpenDoor: (door) => console.log(`Opening ${door}`),
    liabilityDate: null,
    liabilityOutdated: false,
  },
};

export const LiabilityOutdated = {
  args: {
    doors: defaultDoors,
    opening: {
      outerDoor: false,
      upperFloor: false,
      lowerFloor: false,
    },
    onOpenDoor: (door) => console.log(`Opening ${door}`),
    liabilityDate: oldLiabilityDate,
    liabilityOutdated: true,
  },
};
