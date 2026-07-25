import AccountExpenses from "./AccountExpenses";

const d = (iso) => new Date(iso);

const baseData = {
  account: {
    _id: "acc1",
    name: "Träverkstaden — förbrukning",
    explanation: "Sandpapper, borrar, skruv och annat som tar slut.",
  },
  availableYears: [2026, 2025, 2024],
  year: 2026,
  expenses: [
    {
      _id: "e1",
      memberName: "Anna Andersson",
      isMine: true,
      status: "reimbursed",
      date: d("2026-05-14"),
      amount: 1249.5,
      place: "Bauhaus",
      note: "Sandpapper i flera korn, tre paket skruv och två borrsatser till pelarborrmaskinen.",
      submittedAt: d("2026-05-15"),
      confirmedByName: "Bo Berg",
      confirmedAt: d("2026-05-16"),
      rejectedAt: null,
      bookkeepingAccount: "6110",
      reimbursedDate: d("2026-05-20"),
      reimbursedAt: d("2026-05-21"),
      receiptUrl: "https://placehold.co/700x1000?text=Kvitto",
    },
    {
      _id: "e2",
      memberName: "Cecilia Carlsson",
      isMine: false,
      status: "confirmed",
      date: d("2026-06-02"),
      amount: 430,
      place: "Clas Ohlson",
      note: "Nya sågblad.",
      submittedAt: d("2026-06-02"),
      confirmedByName: "Anna Andersson",
      confirmedAt: d("2026-06-03"),
      rejectedAt: null,
      bookkeepingAccount: null,
      reimbursedDate: null,
      reimbursedAt: null,
      receiptUrl: "https://placehold.co/700x1000?text=Kvitto",
    },
    {
      _id: "e3",
      memberName: "David Dahl",
      isMine: true,
      status: "submitted",
      date: d("2026-06-11"),
      amount: 89.9,
      place: null,
      note: null,
      submittedAt: d("2026-06-12"),
      confirmedByName: null,
      confirmedAt: null,
      rejectedAt: null,
      bookkeepingAccount: null,
      reimbursedDate: null,
      reimbursedAt: null,
      receiptUrl: "https://placehold.co/700x1000?text=Kvitto",
    },
    {
      _id: "e4",
      memberName: "Erik Ek",
      isMine: false,
      status: "rejected",
      date: d("2026-04-28"),
      amount: 2500,
      place: "Elgiganten",
      note: "Köpte en högtalare till verkstaden — visade sig inte vara godkänt i förväg.",
      submittedAt: d("2026-04-29"),
      confirmedByName: null,
      confirmedAt: null,
      rejectedAt: d("2026-05-02"),
      bookkeepingAccount: null,
      reimbursedDate: null,
      reimbursedAt: null,
      receiptUrl: "https://placehold.co/700x1000?text=Kvitto",
    },
  ],
};

export default {
  title: "UMSAPP/AccountExpenses",
  component: AccountExpenses,
  parameters: {},
  tags: ["autodocs"],
};

export const Default = {
  args: { data: baseData, newExpenseTo: "/expenses/new?account=acc1", expenseTo: (id) => `/expenses/${id}` },
};

export const AllYears = {
  args: { data: { ...baseData, year: null }, newExpenseTo: "/expenses/new?account=acc1", expenseTo: (id) => `/expenses/${id}` },
};

export const EmptyYear = {
  args: {
    data: { ...baseData, year: 2024, expenses: [] },
    newExpenseTo: "/expenses/new?account=acc1",
    expenseTo: (id) => `/expenses/${id}`,
  },
};

export const Loading = {
  args: { loading: true },
};

export const Error = {
  args: { error: "Not a member of this account's groups" },
};
