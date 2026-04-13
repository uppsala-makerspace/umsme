import MessageDetail from "./MessageDetail";

const now = new Date();

const announcement = {
  _id: "a1",
  type: "newsletter",
  subjectSv: "Sommarhälsning från styrelsen",
  subjectEn: "Summer greetings from the board",
  bodySv: "# Hej alla medlemmar\n\nVi hoppas att ni har en härlig sommar!\n\n- Punkt ett\n- Punkt två\n\nMer info finns på https://example.com/sommar.",
  bodyEn: "# Hello all members\n\nWe hope you have a lovely summer!\n\n- Item one\n- Item two\n\nMore info at https://example.com/summer.",
  status: "sent",
  sentAt: now,
};

const announcementSvOnly = {
  _id: "a2",
  type: "information",
  subjectSv: "Stängt under helgen",
  bodySv: "Lokalen är stängd lördag och söndag på grund av underhåll.",
  status: "sent",
  sentAt: now,
};

const privateMessage = {
  _id: "m1",
  type: "reminder",
  subject: "Påminnelse om medlemsavgift",
  messagetext: "Hej!\n\nDitt medlemskap löper ut snart.\n\nLogga in på appen och förnya:\nhttps://app.uppsalamakerspace.se\n\nMVH styrelsen",
  to: "member@example.com",
  member: "abc",
  template: "tpl",
  senddate: now,
};

export default {
  title: "Pages/MessageDetail",
  component: MessageDetail,
};

export const Loading = {
  args: {
    loading: true,
    kind: "announcement",
    item: null,
  },
};

export const NotFound = {
  args: {
    loading: false,
    kind: "announcement",
    item: null,
  },
};

export const AnnouncementBilingual = {
  args: {
    loading: false,
    kind: "announcement",
    item: announcement,
  },
};

export const AnnouncementSwedishOnly = {
  args: {
    loading: false,
    kind: "announcement",
    item: announcementSvOnly,
  },
};

export const PrivateMessage = {
  args: {
    loading: false,
    kind: "message",
    item: privateMessage,
  },
};
