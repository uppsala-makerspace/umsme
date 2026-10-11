# Expenses for the treasurer

This guide is for you as treasurer. It shows how to pay invoices and reimburse receipts that have been approved. Everything is done in admin. How expenses are made and approved in the app is described in the guide [Expenses](expenses.html).

## 1. What the treasurer does

An expense reaches the treasurer once it has been approved and shows as **Confirmed**. Then it should be paid:

- **Receipt** — the member has already paid. You transfer the amount to the member's bank account.
- **Invoice** — nobody has paid yet. You pay the invoice to the supplier, using the payment details on the invoice.

Once the payment is made you mark the expense in admin and choose which **bookkeeping account** it is booked on. That links the expense to the right row when the bank file is booked later.

Approval is handled by the account's approvers in the app. The board can also confirm submitted expenses in admin, under **Economy** → **Confirm expenses**.

## 2. Find what needs paying

Log in to admin and choose **Economy** → **Reimburse expenses** in the menu. The page has two lists:

- **Invoices to pay** — invoices to be paid, the one due soonest at the top. The due date turns amber as it approaches and red once it has passed.
- **Receipts to reimburse** — receipts to be paid back to members.

Click a row to open the expense.

## 3. Reimburse a receipt

The expense page shows the member, the amount, the account and the receipt image on the right. Click the image to enlarge it. Under **Bank account** you find the member's bank, clearing number and account number, plus a combined string of digits to paste into the bank. Always check the format against what your bank requires.

1. Make the transfer in the bank.
2. Choose the **Bookkeeping account** in the panel below the details.
3. Enter the **Reimbursement date**, the day the money went out.
4. Click **Mark as reimbursed** and confirm.

**Why the date and bookkeeping account matter.** When the bank's transactions are later imported for the bookkeeping, each payout is matched automatically to the right expense. The matching is based on amount and date: the amount must be exactly the same, and the date you enter here may differ by at most five days from the bank's transaction date. So the date doesn't have to be exact, but the closer the better. Two things stop a payout from being matched automatically, so that it has to be booked by hand: the expense has no bookkeeping account, or two reimbursed expenses with the same amount fall within the same five days, since the matching then can't tell which is which.

If it says *no bank account on file*, the member hasn't filled in their bank account. Ask them to do so under **My Profile** in the app.

## 4. Pay an invoice

An invoice shows the **Invoice** label, its due date and the supplier. Where a receipt shows the bank account, an invoice says to pay the supplier according to the invoice. If the invoice is a PDF, open it with **Open PDF invoice**.

1. Pay the invoice in the bank with the details on the invoice.
2. Choose the **Bookkeeping account**.
3. Enter the **Payment date**.
4. Click **Mark as paid** and confirm.

The payment date and bookkeeping account are used for the automatic matching against the bank in the same way as for receipts; see above.

## 5. If something went wrong

- **Wrong account or date:** click **Undo "mark as reimbursed"** (or *paid*). The expense goes back to Confirmed with the account and date still filled in, and you can mark it again.
- **The expense shouldn't be paid:** click **Reject…** and write a reason. The member sees the reason in the app and can correct and submit again.

You can't reimburse your own expenses; someone else has to.
