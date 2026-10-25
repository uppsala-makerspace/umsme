import EventDetail from "./EventDetail";
import { fn } from "storybook/test";
import { intro, events, hosts } from "../components/fixtures";

const later = (h) => new Date(Date.now() + h * 3600000);
const registration = (over = {}) => ({
  required: true, open: true, seats: 10, seatsLeft: 3, queued: 0, queueAllowed: true, infoRequired: false, infoPlaceholder: "",
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
export const NeedsCertificate = withRegistration({ certificate: { _id: "c1", name: { sv: "Svetsning" }, held: false } });
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

