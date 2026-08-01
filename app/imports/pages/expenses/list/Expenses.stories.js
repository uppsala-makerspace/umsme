import Expenses from "./Expenses";

export default {
  title: "UMSAPP/Expenses",
  component: Expenses,
  parameters: {},
  tags: ["autodocs"],
};

const daysAgo = (d) => new Date(Date.now() - d * 24 * 60 * 60 * 1000);

const sample = [
  { _id: "e1", status: "pending", date: daysAgo(1), amount: null, accountName: null, note: "Glömde fråga om kvitto, kollar upp" },
  { _id: "e2", status: "submitted", date: daysAgo(3), submittedAt: daysAgo(2), amount: 249.5, accountName: "Material", note: "Endast halva summan ska återbetalas, dela med en annan medlem" },
  { _id: "e3", status: "rejected", date: daysAgo(5), rejectedAt: daysAgo(4), amount: 1200, accountName: "Verktyg", note: "Skruvdragare", rejectionReason: "Saknar kvitto" },
  { _id: "e4", status: "confirmed", date: daysAgo(8), confirmedAt: daysAgo(6), amount: 99, accountName: "Fika" },
  { _id: "e5", status: "reimbursed", date: daysAgo(20), reimbursedAt: daysAgo(12), amount: 540, accountName: "Material" },
];

export const AllStatuses = {
  args: { loading: false, expenses: sample, accounts: [] },
};

const toApprove = [
  { _id: "r1", status: "submitted", date: daysAgo(4), submittedAt: daysAgo(2), amount: 1450, accountName: "Verktyg", note: "Sticksåg till träverkstaden", submitterName: "Cecilia Ek" },
  { _id: "r2", status: "submitted", date: daysAgo(6), submittedAt: daysAgo(5), amount: 320, accountName: "Material", note: "Plywood", submitterName: "Dan Nilsson" },
];

const recentlyReviewed = [
  { _id: "r3", status: "confirmed", date: daysAgo(9), confirmedAt: daysAgo(1), amount: 78, accountName: "Fika", note: "Kaffe", submitterName: "Eva Lind" },
  { _id: "r4", status: "rejected", date: daysAgo(11), rejectedAt: daysAgo(1), amount: 4200, accountName: "Verktyg", note: "Pelarborrmaskin", submitterName: "Fredrik Ask" },
];

const accounts = [
  {
    _id: "a1",
    name: "Förbrukning",
    explanation: "Sandpapper, borrar, skruv och annat som tar slut.",
    canSpend: true,
    groupNames: [{ sv: "Träverkstaden", en: "The wood workshop" }],
  },
  {
    _id: "a2",
    name: "Verktyg",
    explanation: null,
    canSpend: true,
    groupNames: [
      { sv: "Träverkstaden", en: "The wood workshop" },
      { sv: "Metallverkstaden", en: "The metal workshop" },
    ],
  },
  // A treasurer sees accounts they may review but not spend on.
  {
    _id: "a3",
    name: "Fika",
    explanation: "Kaffe, te och tilltugg till öppna kvällar.",
    canSpend: false,
    groupNames: [{ sv: "Värdgruppen", en: "The host group" }],
  },
];

export const Approver = {
  args: { loading: false, expenses: sample, isApprover: true, toApprove, recentlyReviewed, accounts },
};

export const ApproverNothingToDo = {
  args: { loading: false, expenses: sample, isApprover: true, toApprove: [], recentlyReviewed: [], accounts },
};

// The common case: no approval rights, so two tabs.
export const TwoTabs = {
  args: { loading: false, expenses: sample, accounts: accounts.slice(0, 2) },
};

export const NoAccounts = {
  args: { loading: false, expenses: sample, accounts: [] },
};

export const Empty = {
  args: { loading: false, expenses: [] },
};

export const Loading = {
  args: { loading: true },
};
