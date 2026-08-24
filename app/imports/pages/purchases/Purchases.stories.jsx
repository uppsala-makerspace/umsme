import Purchases from "./Purchases";

export default {
  title: "UMSAPP/Purchases",
  component: Purchases,
  parameters: {},
  tags: ["autodocs"],
};

const daysAgo = (d) => new Date(Date.now() - d * 24 * 60 * 60 * 1000);

// Both classes in one list: purchases link to the new landing page, membership
// payments to the page they have always had.
const payments = [
  {
    _id: "p1", amount: 300, date: daysAgo(2), type: "swish",
    membership: null, storeItem: "s3",
    itemName: { sv: "Lördagskurs: svarvning" }, itemCode: "kurs",
    comment: "Anna Andersson",
  },
  {
    _id: "p2", amount: 1600, date: daysAgo(30), type: "swish",
    membership: "m1", storeItem: null, itemName: null, itemCode: null, comment: null,
  },
  {
    _id: "p3", amount: 85, date: daysAgo(90), type: "swish",
    membership: null, storeItem: "s2",
    itemName: { sv: "Lera, per kilo" }, itemCode: "lera", comment: null,
  },
];

export const Mixed = { args: { loading: false, payments } };
export const Empty = { args: { loading: false, payments: [] } };
export const Loading = { args: { loading: true } };
