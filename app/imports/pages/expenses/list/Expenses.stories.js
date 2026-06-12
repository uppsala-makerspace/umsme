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
  args: { loading: false, expenses: sample },
};

export const Empty = {
  args: { loading: false, expenses: [] },
};

export const Loading = {
  args: { loading: true },
};
