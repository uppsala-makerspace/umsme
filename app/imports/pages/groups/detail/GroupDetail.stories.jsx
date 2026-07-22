import GroupDetail from "./GroupDetail";

const baseData = {
  group: {
    _id: "grp1",
    name: { sv: "Trägruppen", en: "Wood group" },
    description: {
      sv: "Vi ansvarar för träverkstaden:\n\n- underhåll av maskiner\n- påfyllning av material\n- **utbildning** och certifiering",
      en: "We care for the wood workshop.",
    },
    type: "workshop",
    slackChannel: "träverkstaden",
    joinPolicy: "request-responsible",
    imageUrl: "https://placehold.co/800x400?text=Tr%C3%A4gruppen",
    memberCount: 3,
    myState: null,
    myIsResponsible: false,
  },
  members: [
    { memberId: "m1", name: "Anna Andersson", isResponsible: true },
    { memberId: "m2", name: "Bo Berg", isResponsible: false },
    { memberId: "m3", name: "Cecilia Carlsson", isResponsible: false },
  ],
  responsibleName: "Anna Andersson",
  parentGroup: null,
  childGroups: [{ _id: "grp6", name: { sv: "Ugnsgruppen" } }],
  workshop: { _id: "ws1", name: { sv: "Träverkstad" } },
  canSeeMembers: true,
  canJoin: true,
  canApprove: false,
  pendingRequests: [],
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
  title: "Pages/GroupDetail",
  component: GroupDetail,
};

export const NotMember = {
  args: {
    loading: false,
    // Non-members don't get the member list from the server, only the count.
    data: { ...baseData, members: [], canSeeMembers: false },
    slackTeam: "T123",
    slackChannelIds: { "träverkstaden": "C123" },
  },
};

export const NotActiveMember = {
  args: {
    loading: false,
    // No active makerspace membership: join button disabled, no member list.
    data: { ...baseData, members: [], canSeeMembers: false, canJoin: false },
  },
};

export const NoMap = {
  args: {
    loading: false,
    // Interest group without an explicit space: the Slack card stands alone,
    // no empty map card.
    data: {
      ...baseData,
      group: { ...baseData.group, type: "interest" },
      workshop: null,
      childGroups: [],
      mapView: null,
    },
    slackTeam: "T123",
    slackChannelIds: { "träverkstaden": "C123" },
  },
};

export const PendingRequest = {
  args: {
    loading: false,
    data: {
      ...baseData,
      members: [],
      canSeeMembers: false,
      group: { ...baseData.group, myState: "pending" },
    },
  },
};

export const ActiveMember = {
  args: {
    loading: false,
    data: {
      ...baseData,
      group: { ...baseData.group, myState: "active" },
    },
  },
};

export const ResponsibleWithRequests = {
  args: {
    loading: false,
    data: {
      ...baseData,
      group: { ...baseData.group, myState: "active", myIsResponsible: true },
      canApprove: true,
      pendingRequests: [
        { memberId: "m4", name: "David Dahl", requestedAt: new Date("2026-07-01") },
        { memberId: "m5", name: "Eva Ek", requestedAt: new Date("2026-07-10") },
      ],
    },
  },
};

export const ResponsibilitySubgroup = {
  args: {
    loading: false,
    data: {
      ...baseData,
      members: [],
      canSeeMembers: false,
      group: {
        ...baseData.group,
        _id: "grp6",
        name: { sv: "Ugnsgruppen" },
        type: "responsibility",
        description: { sv: "Ansvarar för keramikugnen." },
      },
      parentGroup: { _id: "grp2", name: { sv: "Keramikgruppen" } },
      childGroups: [],
      workshop: null,
    },
  },
};

export const Loading = {
  args: {
    loading: true,
  },
};
