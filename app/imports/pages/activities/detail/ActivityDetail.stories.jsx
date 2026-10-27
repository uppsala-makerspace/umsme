import ActivityDetail from "./ActivityDetail";
import { intro, events } from "../components/fixtures";

export default {
  title: "Pages/Activities/Activity",
  component: ActivityDetail,
  args: { loading: false, data: { activity: intro, events: [events[0]], canEdit: true, canBook: true } },
};

export const Default = { args: { onInterest: () => {} } };
export const Interested = { args: { onInterest: () => {}, data: { activity: intro, events: [], canEdit: false, canBook: false, interested: true, interestCount: 4 } } };
export const AsAMember = { args: { data: { activity: intro, events: [events[0]], canEdit: false, canBook: false } } };
export const NoEvents = { args: { data: { activity: intro, events: [], canEdit: false, canBook: true } } };
export const Failed = { args: { data: null, error: "Activity not found" } };
export const GivesCertificate = {
  args: { onInterest: () => {}, data: { activity: { ...intro, targetCertificate: { _id: "c9", name: { sv: "Glasering" } } }, events: [], canEdit: false, canBook: false } },
};
