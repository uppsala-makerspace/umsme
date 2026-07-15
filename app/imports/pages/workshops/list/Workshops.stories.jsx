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
  },
  {
    _id: "ws2",
    name: { sv: "Keramikverkstad", en: "Ceramics workshop" },
    description: { sv: "Dreja och bränn keramik i vår ugn.", en: "Throw and fire ceramics." },
    status: "trial",
    imageUrl: "https://placehold.co/600x300?text=Keramik",
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
];

export default {
  title: "Pages/Workshops",
  component: Workshops,
};

export const Default = {
  args: {
    loading: false,
    workshops: sampleWorkshops,
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
