import RoomPopup from "./RoomPopup";

const workshopRoom = {
  name: { sv: "Elektronikrummet", en: "Electronics room" },
  description: { sv: "Lödning och elektronik." },
  workshop: {
    _id: "ws5",
    name: { sv: "Elektronikverkstaden" },
    description: { sv: "Löd, programmera och bygg elektronik." },
    status: "established",
    imageUrl: "https://placehold.co/600x300?text=Elektronik",
  },
  areasOfInterest: [],
  groups: [],
};

export default {
  title: "Components/RoomPopup",
  component: RoomPopup,
  args: { onClose: () => {} },
};

export const Workshop = {
  args: { room: workshopRoom },
};

// An area of interest active in another workshop's room: listed below the
// workshop, never the hero.
export const WithAreaOfInterest = {
  args: {
    room: {
      ...workshopRoom,
      areasOfInterest: [{ _id: "ia1", name: { sv: "Vinylskärning" } }],
      groups: [
        { _id: "grp8", name: { sv: "IT-gruppen" }, type: "function", memberCount: 4 },
      ],
    },
  },
};

// A space with no workshop: its own name and description, then the area
// of interest.
export const AreaOfInterestOnly = {
  args: {
    room: {
      name: { sv: "Hörnan vid fönstret" },
      description: { sv: "Ett bord för mindre projekt." },
      workshop: null,
      areasOfInterest: [{ _id: "ia1", name: { sv: "Vinylskärning" } }],
      groups: [],
    },
  },
};
