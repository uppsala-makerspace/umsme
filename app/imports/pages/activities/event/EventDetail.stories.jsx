import EventDetail from "./EventDetail";
import { fn } from "storybook/test";
import { intro, events, hosts } from "../components/fixtures";

const later = (h) => new Date(Date.now() + h * 3600000);
const registration = (over = {}) => ({
  required: true, open: true, member: true, notMemberReason: null, seats: 10, seatsLeft: 3, queued: 0, queueAllowed: true, infoRequired: false, infoPlaceholder: "",
  certificate: null, checkIn: null, mine: null, canWithdraw: false, canTakeSeat: false, canCheckIn: false, ...over,
});
const handlers = { onRegister: fn(), onWithdraw: fn(), onTakeSeat: fn(), onCheckIn: fn(), onAttended: fn(), onCloseAttendance: fn() };
const withRegistration = (over, extra = {}) => ({
  args: { ...handlers, data: { event: events[0], hosts: hosts.slice(0, 1), activityName: intro.name, canEdit: false, registration: registration(over), ...extra } },
});

export default {
  title: "Pages/Activities/Event",
  component: EventDetail,
  args: { loading: false, data: { event: events[0], hosts: hosts.slice(0, 1), activityName: intro.name, canEdit: true } },
};

export const OfAnActivity = {};
export const Cancelled = { args: { data: { event: events[1], hosts: [], activityName: { sv: "Pysselfika" }, canEdit: false } } };
export const FreeStanding = { args: { data: { event: events[2], hosts, activityName: null, canEdit: false } } };

export const SignUp = withRegistration({ infoRequired: true, infoPlaceholder: "Allergier, erfarenhet…" });
export const Registered = withRegistration({ mine: { state: "approved", info: "" }, canWithdraw: true });
export const FullWithQueue = withRegistration({ seatsLeft: 0, queued: 2 });
export const SeatFreeInQueue = withRegistration({ seatsLeft: 1, queued: 2, mine: { state: "queued" }, canTakeSeat: true, canWithdraw: true });
export const CheckInOpen = withRegistration({ mine: { state: "approved" }, canCheckIn: true, canWithdraw: true, checkIn: { opens: later(-2), closes: later(20) } });
export const NeedsCertificate = {
  args: {
    ...handlers,
    data: {
      event: { ...events[0], requiredCertificate: { _id: "c1", name: { sv: "Svetsning" } } }, hosts: hosts.slice(0, 1),
      activityName: intro.name, canEdit: false, registration: registration({ certificate: { _id: "c1", name: { sv: "Svetsning" }, held: false } }),
    },
  },
};
export const GaveUpSeat = withRegistration({ mine: { state: "withdrawn", info: "" }, registerAgainAt: later(0.75) });
export const NoMembership = withRegistration({ member: false, notMemberReason: "noMembership" });
export const AsHost = withRegistration({ mine: null }, {
  participants: [
    { memberId: "m1", name: "Alice Andersson", state: "checkedIn", info: "" },
    { memberId: "m2", name: "Bertil Berg", state: "approved", info: "Vegetarian" },
    { memberId: "m3", name: "Cecilia Ceder", state: "queued", info: "" },
  ],
  attendance: { open: false, closed: false },
});
export const RecordingAttendance = withRegistration({ open: false }, {
  participants: [
    { memberId: "m1", name: "Alice Andersson", state: "attended", info: "" },
    { memberId: "m2", name: "Bertil Berg", state: "approved", info: "" },
  ],
  attendance: { open: true, closed: false },
});
// An event giving a certificate, its host certifying it: one came and holds
// it, one came and may be certified, one has asked for it.
const glazing = { _id: "c9", name: { sv: "Glasering" } };
const attendanceHandlers = {
  onCertify: fn(), onAddAttendee: fn(),
  onFindMembers: async (query) => [{ _id: "m7", name: `Doris Dahl (${query})`, mid: "1234" }],
};
export const GivesCertificate = {
  args: {
    ...handlers,
    ...attendanceHandlers,
    data: {
      event: { ...events[0], targetCertificate: glazing }, hosts: hosts.slice(0, 1), activityName: intro.name, canEdit: false,
      registration: registration({ open: false }),
      participants: [
        { memberId: "m1", name: "Alice Andersson", state: "attended", info: "", certificate: "held", attestationId: "a0" },
        { memberId: "m4", name: "Erik Ek", state: "attended", info: "", certificate: null },
        { memberId: "m2", name: "Bertil Berg", state: "approved", info: "", certificate: "pending", attestationId: "a1" },
        { memberId: "m5", name: "Fredrik Fors", state: "attended", info: "", certificate: "commented", attestationId: "a2" },
        { memberId: "m3", name: "Cecilia Ceder", state: "approved", info: "", certificate: null },
      ],
      attendance: { open: true, closed: false, searchByName: false },
      certificate: { ...glazing, mayCertify: true, noCertifierHost: false },
    },
  },
};
// The same, seen by board or admin (who add by name too), none of its hosts
// certifying it.
export const NoCertifierHost = {
  args: {
    ...handlers,
    ...attendanceHandlers,
    data: {
      ...GivesCertificate.args.data, attendance: { open: true, closed: false, searchByName: true },
      certificate: { ...glazing, mayCertify: false, noCertifierHost: true },
    },
  },
};
export const AsHostWithoutRegistration = {
  args: { ...handlers, data: { event: events[2], hosts, activityName: null, canEdit: true, registration: null, participants: [], attendance: { open: false, closed: false } } },
};

