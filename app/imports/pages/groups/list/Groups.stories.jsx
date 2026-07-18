import Groups from "./Groups";

const sampleGroups = [
  {
    _id: "grp1",
    description: { sv: "Vi tar hand om **träverkstaden**: underhåll av maskiner, påfyllning av material och utbildning. En ganska lång beskrivning som ska trunkeras med ellipsis i listan." },
    name: { sv: "Trägruppen", en: "Wood group" },
    type: "workshop",
    joinPolicy: "request-any",
    imageUrl: "https://placehold.co/600x300?text=Tr%C3%A4gruppen",
    memberCount: 5,
    myState: "active",
    myIsResponsible: false,
  },
  {
    _id: "grp2",
    description: { sv: "Ansvarar för keramikverkstaden med drejskivor och ugn." },
    name: { sv: "Keramikgruppen" },
    type: "workshop",
    joinPolicy: "request-responsible",
    memberCount: 3,
    myState: null,
    myIsResponsible: false,
  },
  {
    _id: "grp3",
    description: { sv: "Sköter föreningens IT: medlemssystemet, nätverk och [verktygswebben](https://example.com)." },
    name: { sv: "IT-gruppen", en: "IT group" },
    type: "function",
    joinPolicy: "request-responsible",
    memberCount: 4,
    myState: "pending",
    myIsResponsible: false,
  },
  {
    _id: "grp4",
    name: { sv: "Städgruppen" },
    type: "function",
    joinPolicy: "open",
    memberCount: 8,
    myState: "active",
    myIsResponsible: true,
  },
  {
    _id: "grp5",
    description: { sv: "Vi bygger modelljärnväg i skala H0 och arrangerar körkvällar." },
    name: { sv: "Modelljärnvägsgruppen" },
    type: "interest",
    joinPolicy: "open",
    memberCount: 12,
    myState: null,
    myIsResponsible: false,
  },
  {
    _id: "grp6",
    name: { sv: "Ugnsgruppen" },
    type: "responsibility",
    parentGroupId: "grp2",
    joinPolicy: "request-responsible",
    memberCount: 2,
    myState: null,
    myIsResponsible: false,
  },
];

export default {
  title: "Pages/Groups",
  component: Groups,
};

export const Default = {
  args: {
    loading: false,
    groups: sampleGroups,
  },
};

export const Loading = {
  args: {
    loading: true,
    groups: [],
  },
};

export const Empty = {
  args: {
    loading: false,
    groups: [],
  },
};
