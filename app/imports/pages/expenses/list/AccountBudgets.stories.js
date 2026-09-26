import AccountBudgets from "./AccountBudgets";

export default {
  title: "UMSAPP/AccountBudgets",
  component: AccountBudgets,
};

const totals = (submitted, confirmed, reimbursed) => ({ submitted, confirmed, reimbursed });

const accounts = [
  {
    _id: "a1",
    name: "Förbrukning",
    groupNames: [{ sv: "Träverkstaden", en: "Wood workshop" }],
    budget: 10000,
    lastRevision: { setAt: new Date("2026-01-12"), comment: null, setByName: "Kim Kassör", count: 1 },
    totals: totals(450, 2300, 3100),
    bookkeeping: [
      { account: "5010", name: "Lokalkostnader", amount: 1800 },
      { account: "6110", name: "Kontorsmateriel", amount: 1300 },
    ],
  },
  {
    _id: "a2",
    name: "Förbrukning",
    groupNames: [{ sv: "Metallverkstaden", en: "Metal workshop" }],
    budget: 6000,
    lastRevision: {
      setAt: new Date("2026-05-04"),
      comment: "Utökad efter inköp av ny svets",
      setByName: "Kim Kassör",
      count: 2,
    },
    totals: totals(900, 2600, 4100),
    bookkeeping: [{ account: "6110", name: "Kontorsmateriel", amount: 4100 }],
  },
  {
    _id: "a3",
    name: "Kansli",
    groupNames: [{ sv: "Styrelsen", en: "Board" }],
    budget: null,
    lastRevision: null,
    totals: totals(0, 350, 1200),
    bookkeeping: [{ account: "6110", name: "Kontorsmateriel", amount: 1200 }],
  },
];

const base = {
  loading: false,
  error: null,
  year: 2026,
  availableYears: [2026, 2025],
  onYearChange: (y) => console.log("Year:", y),
};

const bookkeeping = [
  { account: "5010", name: "Lokalkostnader", amount: 1800 },
  { account: "6110", name: "Kontorsmateriel", amount: 6600 },
];

export const Default = { args: { ...base, accounts, bookkeeping } };

export const Overspent = { args: { ...base, accounts: [accounts[1]] } };

export const NoBudget = { args: { ...base, accounts: [accounts[2]] } };

export const Empty = { args: { ...base, accounts: [] } };

export const Loading = { args: { ...base, loading: true, accounts: [] } };
