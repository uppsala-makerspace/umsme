import { fn } from "storybook/test";
import ExpenseDetail from "./ExpenseDetail";

export default {
  title: "UMSAPP/ExpenseDetail",
  component: ExpenseDetail,
  parameters: {},
  tags: ["autodocs"],
};

const accounts = [
  { _id: "a1", name: "Material", explanation: "Förbrukningsmaterial" },
  { _id: "a2", name: "Verktyg", explanation: "Verktyg och utrustning" },
];

const baseActions = {
  placeSuggestions: ["Biltema", "Bauhaus", "Clas Ohlson, Uppsala", "Slöjd-Detaljer"],
  onSave: fn(),
  onSubmit: fn(),
  onRetract: fn(),
  onAbort: fn(),
  onReplacePhoto: fn(),
  onApprove: fn(),
  onReject: fn(),
};

const expense = (overrides) => ({
  _id: "e1",
  status: "pending",
  date: new Date(),
  amount: null,
  expenseAccountId: "",
  note: "",
  accountName: null,
  ...overrides,
});

export const PendingDraft = {
  args: { expense: expense({ status: "pending" }), accounts, ...baseActions },
};

export const SubmittedRetractable = {
  args: {
    expense: expense({
      status: "submitted", amount: 249.5, expenseAccountId: "a1", accountName: "Material",
      submittedAt: new Date("2026-06-12"),
    }),
    accounts,
    ...baseActions,
  },
};

// Someone else's submitted expense, seen by an approver: Godkänn/Avslå
// instead of Återkalla.
export const ToApprove = {
  args: {
    expense: expense({
      status: "submitted", amount: 1450, expenseAccountId: "a2", accountName: "Verktyg",
      note: "Sticksåg till träverkstaden", place: "Bauhaus",
      submittedAt: new Date("2026-07-20"), submitterName: "Cecilia Ek",
      isOwn: false, canApprove: true,
    }),
    accounts,
    ...baseActions,
  },
};

// The same expense after the reviewer rejected it: read-only, with the reason
// they gave. A rejected expense is editable — but only by its submitter.
export const ReviewedRejected = {
  args: {
    expense: expense({
      status: "rejected", amount: 1450, expenseAccountId: "a2", accountName: "Verktyg",
      note: "Sticksåg till träverkstaden", place: "Bauhaus",
      submittedAt: new Date("2026-07-20"), submitterName: "Cecilia Ek",
      rejectionReason: "Köp den billigare modellen och skicka in på nytt.",
      rejectedByName: "Bo Berg", rejectedAt: new Date("2026-07-21"),
      isOwn: false, canApprove: false,
    }),
    accounts,
    ...baseActions,
  },
};

export const Rejected = {
  args: {
    expense: expense({ status: "rejected", amount: 1200, expenseAccountId: "a2", accountName: "Verktyg", rejectionReason: "Kvittot är oläsligt, ladda upp en tydligare bild." }),
    accounts,
    ...baseActions,
  },
};

export const ConfirmedLocked = {
  args: {
    expense: expense({
      status: "confirmed", amount: 99, expenseAccountId: "a1", accountName: "Material",
      submittedAt: new Date("2026-06-02"), confirmedByName: "Bo Berg", confirmedAt: new Date("2026-06-03"),
    }),
    accounts,
    ...baseActions,
  },
};

export const ReimbursedLocked = {
  args: {
    expense: expense({
      status: "reimbursed", amount: 540, expenseAccountId: "a1", accountName: "Material",
      submittedAt: new Date("2026-05-15"), confirmedByName: "Bo Berg", confirmedAt: new Date("2026-05-16"),
      bookkeepingAccount: "6110", reimbursedDate: new Date("2026-05-20"),
    }),
    accounts,
    ...baseActions,
  },
};

export const Loading = {
  args: { loading: true, ...baseActions },
};
