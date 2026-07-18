import WorkshopDetail from "./WorkshopDetail";

const sampleData = {
  workshop: {
    _id: "ws1",
    name: { sv: "Träverkstad", en: "Wood workshop" },
    description: {
      sv: "Snickra, svarva och bygg i trä.\n\n## Maskiner\n\n- Hyvelbänkar\n- Bandsåg\n- Pelarborr\n\nVissa maskiner **kräver certifikat**. Läs mer i [guiderna](https://tutorial.uppsalamakerspace.se).",
      en: "Woodworking with workbenches, band saw and much more.",
    },
    status: "trial",
    slackChannel: "träverkstaden",
    guidesUrl: "https://tutorial.uppsalamakerspace.se",
    imageUrl: "https://placehold.co/800x400?text=Tr%C3%A4verkstad",
  },
  group: {
    _id: "grp1",
    name: { sv: "Trägruppen", en: "Wood group" },
    type: "workshop",
    memberCount: 5,
    myState: "active",
  },
  responsibilityGroups: [
    { _id: "grp2", name: { sv: "Svarvgruppen" }, type: "responsibility", memberCount: 2, myState: null },
    { _id: "grp3", name: { sv: "Verktygsvårdsgruppen" }, type: "responsibility", memberCount: 3, myState: "pending" },
  ],
  relatedGroups: [
    { _id: "grp4", name: { sv: "Cykelgruppen", en: "Bike kitchen" }, type: "interest", memberCount: 7, myState: null },
  ],
  certificates: [
    { _id: "cert1", name: { sv: "Bandsåg", en: "Band saw" } },
    { _id: "cert2", name: { sv: "Planhyvel", en: "Planer" } },
  ],
  mapView: {
    floor: "floor1",
    primarySpaceId: "woodworkshop",
    spaces: [
      {
        spaceId: "woodworkshop",
        floor: "floor1",
        iconUrl: "https://placehold.co/96x96?text=primary",
      },
      {
        spaceId: "CNCworkshop",
        floor: "floor1",
        iconUrl: "https://placehold.co/96x96?text=secondary",
      },
    ],
  },
};

export default {
  title: "Pages/WorkshopDetail",
  component: WorkshopDetail,
};

export const Default = {
  args: {
    loading: false,
    data: sampleData,
    slackTeam: "T123",
    slackChannelIds: { "träverkstaden": "C123" },
  },
};

export const ManySpaceIcons = {
  args: {
    loading: false,
    data: {
      ...sampleData,
      mapView: {
        ...sampleData.mapView,
        spaces: [
          {
            spaceId: "woodworkshop",
            floor: "floor1",
            iconUrl: "https://placehold.co/96x96?text=primary",
          },
          {
            spaceId: "CNCworkshop",
            floor: "floor1",
            iconUrl: "https://placehold.co/96x96?text=sec1",
          },
          {
            spaceId: "3dworkshop",
            floor: "floor1",
            iconUrl: "https://placehold.co/96x96?text=sec2",
          },
          {
            spaceId: "metalworkshop",
            floor: "floor1",
            iconUrl: "https://placehold.co/96x96?text=sec3",
          },
          {
            spaceId: "textiles_workshop",
            floor: "floor2",
            iconUrl: "https://placehold.co/96x96?text=sec4",
          },
        ],
      },
    },
    slackTeam: "T123",
    slackChannelIds: { "träverkstaden": "C123" },
  },
};

export const WithoutImageAndGroup = {
  args: {
    loading: false,
    data: {
      workshop: {
        _id: "ws2",
        name: { sv: "Keramikverkstad" },
        description: { sv: "Dreja och bränn keramik." },
        status: "forming",
      },
      group: null,
      responsibilityGroups: [],
      relatedGroups: [],
      certificates: [],
    },
  },
};

export const Loading = {
  args: {
    loading: true,
  },
};

export const Error = {
  args: {
    loading: false,
    error: "Workshop not found",
  },
};
