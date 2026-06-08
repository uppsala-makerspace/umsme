import { fn } from "storybook/test";
import ExpenseDetail from "./ExpenseDetail";

export default {
  title: "UMSAPP/ExpenseDetail",
  component: ExpenseDetail,
  parameters: {},
  tags: ["autodocs"],
};

const accounts = [
  { _id: "a1", name: "Material", explanation: "Förbrukningsmaterial", accountNumber: "4010" },
  { _id: "a2", name: "Verktyg", explanation: "Verktyg och utrustning", accountNumber: "4020" },
];

const baseActions = {
  onSave: fn(),
  onSubmit: fn(),
  onRetract: fn(),
  onAbort: fn(),
  onReplacePhoto: fn(),
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
    expense: expense({ status: "submitted", amount: 249.5, expenseAccountId: "a1", accountName: "Material" }),
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
    expense: expense({ status: "confirmed", amount: 99, expenseAccountId: "a1", accountName: "Material" }),
    accounts,
    ...baseActions,
  },
};

export const ReimbursedLocked = {
  args: {
    expense: expense({ status: "reimbursed", amount: 540, expenseAccountId: "a1", accountName: "Material" }),
    accounts,
    ...baseActions,
  },
};

export const Loading = {
  args: { loading: true, ...baseActions },
};
