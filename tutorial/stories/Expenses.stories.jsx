import React, { useEffect } from "react";
import { fn } from "storybook/test";
import Profile from "/imports/pages/profile/Profile";
import NewExpense from "/imports/pages/expenses/new/NewExpense";
import ExpenseDetail from "/imports/pages/expenses/detail/ExpenseDetail";
import Expenses from "/imports/pages/expenses/list/Expenses";
import AccountExpenses from "/imports/pages/expenseAccount/AccountExpenses";
import { withLayout } from "./decorators";
import {
  member,
  sandpaperReceipt,
  bandsawReceipt,
  expenseAccounts,
  myExpenses,
  toApprove,
  recentlyReviewed,
  budgetOverview,
  woodAccountPage,
} from "./fixtures";

// Screenshots for the expenses tutorial (tutorial/{sv,en}/expenses.md).
// Generate only these with: ONLY=tutorial-expenses npm run shoot
export default {
  title: "Tutorial/Expenses",
  decorators: [withLayout],
};

/**
 * Scrolls the layout's <main> once the story has rendered, for frames whose
 * subject sits below the fold of the 900px-tall screenshot. `to` is a pixel
 * offset, "bottom", or a list of heading texts (one per language) to bring to
 * the top of the screen.
 */
const ScrollMain = ({ to, children }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      const main = document.querySelector("main");
      if (!main) return;
      if (to === "bottom") {
        main.scrollTop = main.scrollHeight;
      } else if (Array.isArray(to)) {
        const heading = [...main.querySelectorAll("h1, h2, h3, h4, legend, label, span, p")]
          .find((el) => to.includes(el.textContent.trim()));
        if (heading) main.scrollTop += heading.getBoundingClientRect().top - main.getBoundingClientRect().top - 16;
      } else {
        main.scrollTop = to;
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [to]);
  return children;
};

const detailActions = {
  placeSuggestions: ["Järnhandeln", "Byggvaruhuset", "Clas Ohlson, Uppsala"],
  onSave: fn(),
  onSubmit: fn(),
  onRetract: fn(),
  onAbort: fn(),
  onReplacePhoto: fn(),
  onApprove: fn(),
  onReject: fn(),
};

const listArgs = {
  loading: false,
  error: null,
  expenses: myExpenses,
  isApprover: true,
  toApprove,
  recentlyReviewed,
  accounts: expenseAccounts,
  budgetOverview,
  onBudgetYearChange: fn(),
};

// Filename: expenses-profile-bank-{lang}.png — My Profile scrolled to the
// bank account section, filled in.
export const ExpensesProfileBank = {
  render: (args) => (
    <ScrollMain to={["Bankkonto", "Bank account"]}>
      <Profile {...args} />
    </ScrollMain>
  ),
  args: {
    onSubmit: fn(),
    showBank: true,
    initialName: member.name,
    initialMobile: member.phone,
    initialBirthyear: "1985",
    initialGender: "male",
    initialRfid: member.rfid,
    initialBankName: "Swedbank",
    initialBankClearing: "8327-9",
    initialBankAccountNumber: "123 456 789-0",
  },
  parameters: { tutorial: { path: "/profile" } },
};

// Filename: expenses-new-choose-{lang}.png — New expense: receipt or invoice.
export const ExpensesNewChoose = {
  render: (args) => <NewExpense {...args} />,
  args: { type: null, onChooseType: fn(), onCapture: fn() },
  parameters: { tutorial: { path: "/expenses/new" } },
};

// Filename: expenses-new-capture-{lang}.png — photograph or upload the receipt.
export const ExpensesNewCapture = {
  render: (args) => <NewExpense {...args} />,
  args: { type: "receipt", onChooseType: fn(), onCapture: fn() },
  parameters: { tutorial: { path: "/expenses/new" } },
};

// Filename: expenses-form-receipt-{lang}.png — the form filled in for a
// receipt, scrolled past the receipt image to the fields.
export const ExpensesFormReceipt = {
  render: (args) => (
    <ScrollMain to={["Typ", "Type"]}>
      <ExpenseDetail {...args} />
    </ScrollMain>
  ),
  args: {
    ...detailActions,
    expense: {
      _id: "e-new", status: "pending", type: "receipt", isOwn: true, mimeType: "image/svg+xml",
      date: myExpenses[1].date, amount: 412, expenseAccountId: "acc-wood", place: "Järnhandeln",
      note: "Sandpapper, skruv och trälim till träverkstaden",
    },
    receiptUrl: sandpaperReceipt,
    accounts: expenseAccounts,
  },
  parameters: { tutorial: { path: "/expenses/e-new" } },
};

// Filename: expenses-mine-{lang}.png — My expenses, grouped by status.
export const ExpensesMine = {
  render: (args) => <Expenses {...args} />,
  args: listArgs,
  parameters: { tutorial: { path: "/expenses" } },
};

// Filename: expenses-rejected-{lang}.png — a rejected expense with the reason.
export const ExpensesRejected = {
  render: (args) => <ExpenseDetail {...args} />,
  args: {
    ...detailActions,
    expense: {
      _id: "e-rej", status: "rejected", type: "receipt", isOwn: true, mimeType: "image/svg+xml",
      date: myExpenses[1].date, amount: 412, expenseAccountId: "acc-textile", place: "Järnhandeln",
      note: "Sandpapper, skruv och trälim",
      rejectionReason: "Det här är inköp till träverkstaden. Byt till Träverkstadens konto och skicka in igen.",
    },
    receiptUrl: sandpaperReceipt,
    accounts: expenseAccounts,
  },
  parameters: { tutorial: { path: "/expenses/e-rej" } },
};

// Filename: expenses-approve-list-{lang}.png — the Approve tab.
export const ExpensesApproveList = {
  render: (args) => <Expenses {...args} />,
  args: listArgs,
  parameters: { tutorial: { path: "/expenses?tab=approve" } },
};

// Filename: expenses-approve-detail-{lang}.png — reviewing someone else's
// expense, scrolled to the Approve and Reject buttons.
export const ExpensesApproveDetail = {
  render: (args) => (
    <ScrollMain to="bottom">
      <ExpenseDetail {...args} />
    </ScrollMain>
  ),
  args: {
    ...detailActions,
    expense: {
      _id: "a-1", status: "submitted", type: "receipt", isOwn: false, canApprove: true,
      submitterName: toApprove[0].submitterName, mimeType: "image/svg+xml",
      date: toApprove[0].date, submittedAt: toApprove[0].submittedAt, amount: toApprove[0].amount,
      expenseAccountId: "acc-wood", accountName: toApprove[0].accountName, place: "Järnhandeln",
      note: toApprove[0].note,
    },
    receiptUrl: bandsawReceipt,
    accounts: expenseAccounts,
  },
  parameters: { tutorial: { path: "/expenses/a-1" } },
};

// Filename: expenses-budget-{lang}.png — the Accounts tab in budget view.
export const ExpensesBudget = {
  render: (args) => <Expenses {...args} />,
  args: listArgs,
  parameters: { tutorial: { path: "/expenses?tab=accounts&view=budget" } },
};

// Filename: expenses-account-{lang}.png — one expense account's page.
export const ExpensesAccount = {
  render: (args) => <AccountExpenses {...args} />,
  args: {
    loading: false,
    error: null,
    data: woodAccountPage,
    newExpenseTo: "/expenses/new?account=acc-wood",
    expenseTo: (id) => `/expenses/${id}`,
    onYearChange: fn(),
  },
  parameters: { tutorial: { path: "/expense-accounts/acc-wood" } },
};
