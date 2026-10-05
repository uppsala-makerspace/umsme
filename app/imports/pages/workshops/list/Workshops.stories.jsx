import Workshops from "./Workshops";

const sampleWorkshops = [
  {
    _id: "ws1",
    name: { sv: "Träverkstad", en: "Wood workshop" },
    description: {
      sv: "**Snickra**, svarva och bygg i trä. Här finns [hyvelbänkar](https://example.com), bandsåg, pelarborr, planhyvel och mycket mer — en lång beskrivning som ska kortas av med ellipsis i listan i stället för att visas i sin helhet.",
      en: "Woodworking with workbenches, band saw and much more.",
    },
    status: "established",
    slackChannel: "träverkstaden",
    imageUrl: "https://placehold.co/600x300?text=Tr%C3%A4verkstad",
    spaceIconUrl: "https://placehold.co/80x80?text=icon",
  },
  {
    _id: "ws2",
    name: { sv: "Keramikverkstad", en: "Ceramics workshop" },
    description: { sv: "Dreja och bränn keramik i vår ugn.", en: "Throw and fire ceramics." },
    status: "trial",
    imageUrl: "https://placehold.co/600x300?text=Keramik",
    spaceIconUrl: "https://placehold.co/80x80?text=icon",
  },
  {
    _id: "ws3",
    name: { sv: "Textilverkstad", en: "Textile workshop" },
    description: { sv: "Sy, brodera och väv.", en: "Sew, embroider and weave." },
    status: "forming",
  },
  {
    _id: "ws4",
    name: { sv: "Mörkrumsverkstad" },
    description: { sv: "Analog fotoframkallning." },
    status: "decommissioned",
  },
  {
    _id: "ia1",
    kind: "areaOfInterest",
    name: { sv: "Vinylskärning", en: "Vinyl cutting" },
    description: { sv: "Dekaler, t-shirttryck, skyltar och stenciler med vinylskäraren." },
    status: "trial",
    imageUrl: "https://placehold.co/600x300?text=Vinyl",
  },
  {
    _id: "ia2",
    kind: "areaOfInterest",
    name: { sv: "Lördagskurser", en: "Saturday courses" },
    description: { sv: "Kurser för medlemmar varannan lördag, i flera verkstäder." },
    status: "established",
  },
];

export default {
  title: "Pages/Workshops",
  component: Workshops,
};

export const Default = {
  args: {
    loading: false,
    workshops: sampleWorkshops,
    initialKind: "workshop",
  },
};

export const AreasOfInterest = {
  args: {
    loading: false,
    workshops: sampleWorkshops,
    initialKind: "areaOfInterest",
  },
};

// Workshops exist but no area of interest yet: the switch shows its own empty text.
export const NoAreasOfInterest = {
  args: {
    loading: false,
    workshops: sampleWorkshops.filter((w) => w.kind !== "areaOfInterest"),
    initialKind: "areaOfInterest",
  },
};

export const Loading = {
  args: {
    loading: true,
    workshops: [],
  },
};

export const Empty = {
  args: {
    loading: false,
    workshops: [],
  },
};
