import Unlock from "./Unlock";

const defaultDoors = [
  { id: "outerDoor", labelKey: "outerDoor" },
  { id: "upperFloor", labelKey: "upperFloor" },
  { id: "lowerFloor", labelKey: "lowerFloor" },
];

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
  },
};

export const SingleDoor = {
  args: {
    doors: [{ id: "mainEntrance", labelKey: "outerDoor" }],
    opening: {
      mainEntrance: false,
    },
    onOpenDoor: (door) => console.log(`Opening ${door}`),
  },
};
