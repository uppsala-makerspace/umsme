import Unlock from "./Unlock";

// Doors without location (backward compatible)
const defaultDoors = [
  { id: "outerDoor", labelKey: "outerDoor" },
  { id: "upperFloor", labelKey: "upperFloor" },
  { id: "lowerFloor", labelKey: "lowerFloor" },
];

// Doors with location data
const doorsWithLocation = [
  { id: "outerDoor", labelKey: "outerDoor", location: { lat: 59.858, long: 17.639 } },
  { id: "upperFloor", labelKey: "upperFloor", location: { lat: 59.858, long: 17.639 } },
  { id: "lowerFloor", labelKey: "lowerFloor", location: { lat: 59.858, long: 17.639 } },
];

// User positions
const userNearby = { lat: 59.858, long: 17.639 }; // At the location
const userFarAway = { lat: 59.85, long: 17.63 }; // ~900m away

const liabilityDate = new Date("2024-01-15");
const oldLiabilityDate = new Date("2023-06-01");

const defaultOpening = {
  outerDoor: false,
  upperFloor: false,
  lowerFloor: false,
};

export default {
  title: "Pages/Unlock",
  component: Unlock,
};

export const Default = {
  args: {
    doors: defaultDoors,
    opening: defaultOpening,
    onOpenDoor: (door) => console.log(`Opening ${door}`),

    liabilityDate,
    liabilityOutdated: false,
    locationPermission: "granted",
    userPosition: userNearby,
    proximityRange: 100,
    isAdmin: false,
  },
};

export const InRange = {
  args: {
    doors: doorsWithLocation,
    opening: defaultOpening,
    onOpenDoor: (door) => console.log(`Opening ${door}`),

    liabilityDate,
    liabilityOutdated: false,
    locationPermission: "granted",
    userPosition: userNearby,
    proximityRange: 100,
    isAdmin: false,
  },
};

export const OutOfRange = {
  args: {
    doors: doorsWithLocation,
    opening: defaultOpening,
    onOpenDoor: (door) => console.log(`Opening ${door}`),

    liabilityDate,
    liabilityOutdated: false,
    locationPermission: "granted",
    userPosition: userFarAway,
    proximityRange: 100,
    isAdmin: false,
  },
};

export const LocationDeniedBrowser = {
  args: {
    doors: doorsWithLocation,
    opening: defaultOpening,
    onOpenDoor: (door) => console.log(`Opening ${door}`),

    liabilityDate,
    liabilityOutdated: false,
    locationPermission: "denied",
    userPosition: null,
    proximityRange: 100,
    isAdmin: false,
    isPWAOverride: false,
  },
};

export const LocationDeniedPWA = {
  args: {
    doors: doorsWithLocation,
    opening: defaultOpening,
    onOpenDoor: (door) => console.log(`Opening ${door}`),

    liabilityDate,
    liabilityOutdated: false,
    locationPermission: "denied",
    userPosition: null,
    proximityRange: 100,
    isAdmin: false,
    isPWAOverride: true,
  },
};

export const AdminBypass = {
  args: {
    doors: doorsWithLocation,
    opening: defaultOpening,
    onOpenDoor: (door) => console.log(`Opening ${door}`),

    liabilityDate,
    liabilityOutdated: false,
    locationPermission: "granted",
    userPosition: userFarAway,
    proximityRange: 100,
    isAdmin: true,
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
    locationPermission: "granted",
    userPosition: userNearby,
    proximityRange: 100,
    isAdmin: false,
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
    locationPermission: "granted",
    userPosition: userNearby,
    proximityRange: 100,
    isAdmin: false,
  },
};

export const NoDoors = {
  args: {
    doors: [],
    opening: {},
    onOpenDoor: (door) => console.log(`Opening ${door}`),

    liabilityDate,
    liabilityOutdated: false,
    locationPermission: "granted",
    userPosition: userNearby,
    proximityRange: 100,
    isAdmin: false,
  },
};

export const LiabilityNotApproved = {
  args: {
    doors: defaultDoors,
    opening: defaultOpening,
    onOpenDoor: (door) => console.log(`Opening ${door}`),

    liabilityDate: null,
    liabilityOutdated: false,
    locationPermission: "granted",
    userPosition: userNearby,
    proximityRange: 100,
    isAdmin: false,
  },
};

export const LiabilityOutdated = {
  args: {
    doors: defaultDoors,
    opening: defaultOpening,
    onOpenDoor: (door) => console.log(`Opening ${door}`),

    liabilityDate: oldLiabilityDate,
    liabilityOutdated: true,
    locationPermission: "granted",
    userPosition: userNearby,
    proximityRange: 100,
    isAdmin: false,
  },
};

export const MemberIntroductionMissing = {
  args: {
    doors: defaultDoors,
    opening: defaultOpening,
    onOpenDoor: (door) => console.log(`Opening ${door}`),

    liabilityDate,
    liabilityOutdated: false,
    mandatoryCertificate: { _id: "abc123", name: { en: "Member Introduction", sv: "Medlemsintroduktion" } },
    hasMandatoryCertificate: false,
    locationPermission: "granted",
    userPosition: userNearby,
    proximityRange: 100,
    isAdmin: false,
  },
};
