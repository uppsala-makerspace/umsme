import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { PaperAirplaneIcon, InformationCircleIcon } from "@heroicons/react/24/outline";
import MainContent from "../../../components/MainContent";
import Loader from "../../../components/Loader";
import Button from "../../../components/Button";
import ReceiptCapture from "../components/ReceiptCapture";
import PlaceAutocomplete from "../components/PlaceAutocomplete";
import { isEditable, formatDate, toDateInputValue } from "../utils";

const ExpenseDetail = ({
  loading,
  error,
  expense,
  accounts,
  placeSuggestions,
  receiptUrl,
  onSave,
  onSubmit,
  onRetract,
  onAbort,
  onReplacePhoto,
  onApprove,
  onReject,
}) => {
  const { t, i18n } = useTranslation();
  const lang = i18n.language || "sv";
  const [amount, setAmount] = useState("");
  const [expenseAccountId, setExpenseAccountId] = useState("");
  const [place, setPlace] = useState("");
  const [date, setDate] = useState("");
  const [note, setNote] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [showRejectReason, setShowRejectReason] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  useEffect(() => {
    if (expense) {
      setAmount(expense.amount != null ? String(expense.amount) : "");
      setExpenseAccountId(expense.expenseAccountId || "");
      setPlace(expense.place || "");
      setDate(toDateInputValue(expense.date));
      setNote(expense.note || "");
    }
  }, [expense]);

  if (loading) {
    return (
      <MainContent>
        <Loader />
      </MainContent>
    );
  }

  if (error || !expense) {
    return (
      <MainContent>
        <p className="text-red-600 text-center p-8">{error || t("expenseNotFound")}</p>
      </MainContent>
    );
  }

  // A rejected expense is editable — but only by the one who submitted it. A
  // reviewer opening the same expense gets the read-only view.
  const isReviewer = expense.isOwn === false;
  const editable = !isReviewer && isEditable(expense.status);
  const canSubmit = !!amount && Number(amount) > 0 && !!expenseAccountId;

  // The account currently in play: the picked one while editing, the saved one
  // otherwise. Its overview page is not group-scoped, so the id is enough.
  const shownAccount = accounts.find(
    (a) => a._id === (editable ? expenseAccountId : expense.expenseAccountId)
  );
  const accountPath = shownAccount ? `/expense-accounts/${shownAccount._id}` : null;

  const run = async (fn, ...args) => {
    setActionLoading(true);
    try {
      await fn(...args);
    } finally {
      setActionLoading(false);
    }
  };

  const formFields = () => ({
    amount: amount === "" ? null : Number(amount),
    expenseAccountId: expenseAccountId || null,
    place,
    date: date ? new Date(date) : undefined,
    note,
  });

  const handleSave = () => run(onSave, formFields());
  // Persist the current form values before submitting, so the server validates
  // exactly what the user sees rather than the last-saved (possibly stale) doc.
  const handleSubmit = () => run(onSubmit, formFields());

  return (
    <MainContent>
      <h2 className="text-2xl mb-1">{t("expense")}</h2>
      <p className="text-sm text-gray-500 mb-4">{t(`expenseStatus_${expense.status}`)}</p>

      {expense.status === "rejected" && expense.rejectionReason && (
        <div className="p-4 mb-6 bg-red-50 border border-red-200 rounded-lg">
          <span className="block text-xs font-semibold text-red-700 uppercase tracking-wide mb-1">
            {t("expenseRejectionReason")}
          </span>
          <p className="m-0 text-sm text-red-700">{expense.rejectionReason}</p>
        </div>
      )}

      {receiptUrl ? (
        <div className="relative mb-6">
          <a href={receiptUrl} target="_blank" rel="noreferrer">
            <img
              src={receiptUrl}
              alt={t("expenseReceipt")}
              className="w-full rounded-lg border border-gray-200"
            />
          </a>
          {editable && (
            <ReceiptCapture
              overlay
              busy={actionLoading}
              onCapture={(img) => run(onReplacePhoto, img)}
            />
          )}
        </div>
      ) : (
        <p className="text-gray-400 mb-6">{t("expenseReceiptLoading")}</p>
      )}

      {editable ? (
        <div className="flex flex-col gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">{t("expenseAmount")}</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="border border-gray-300 rounded p-3"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">{t("expenseAccount")}</span>
            <select
              value={expenseAccountId}
              onChange={(e) => setExpenseAccountId(e.target.value)}
              className="border border-gray-300 rounded p-3"
            >
              <option value="">{t("expenseChooseAccount")}</option>
              {accounts.map((a) => (
                <option key={a._id} value={a._id}>{a.name}</option>
              ))}
            </select>
            {expenseAccountId && (
              <span className="text-xs text-gray-500">{shownAccount?.explanation}</span>
            )}
            {accountPath && (
              <Link to={accountPath} className="text-xs text-gray-600 hover:underline">
                {t("expenseOpenAccount")} &rarr;
              </Link>
            )}
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">{t("expensePlace")}</span>
            <PlaceAutocomplete
              value={place}
              onChange={setPlace}
              suggestions={placeSuggestions}
              placeholder={t("expensePlacePlaceholder")}
              className="border border-gray-300 rounded p-3 w-full"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">{t("expenseDate")}</span>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="border border-gray-300 rounded p-3"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">{t("expenseNote")}</span>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              className="border border-gray-300 rounded p-3"
              placeholder={t("expenseNotePlaceholder")}
            />
          </label>

          <div className="flex gap-2">
            <Button className="flex-1" disabled={actionLoading} onClick={handleSave}>
              {t("expenseSave")}
            </Button>
            <Button
              className="flex-1"
              disabled={actionLoading || !canSubmit}
              onClick={handleSubmit}
            >
              <PaperAirplaneIcon className="w-4 h-4 inline" /> {t("expenseSubmit")}
            </Button>
          </div>
          {!canSubmit && (
            <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-300 rounded-lg text-sm text-yellow-800">
              <InformationCircleIcon className="w-5 h-5 flex-shrink-0" />
              <span>{t("expenseSubmitHint")}</span>
            </div>
          )}

          <Button
            variant="danger"
            fullWidth
            disabled={actionLoading}
            onClick={() => {
              if (window.confirm(t("expenseAbortConfirm"))) run(onAbort);
            }}
          >
            {t("expenseAbort")}
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-2 text-sm text-gray-700">
          {/* Only set when someone else is looking at it, i.e. a reviewer. */}
          {expense.submitterName && (
            <div>
              <span className="font-semibold">{t("expenseSubmittedBy")}:</span>{" "}
              {expense.submitterName}
            </div>
          )}
          <div><span className="font-semibold">{t("expenseAmount")}:</span> {expense.amount} kr</div>
          <div>
            <span className="font-semibold">{t("expenseAccount")}:</span>{" "}
            {accountPath ? (
              <Link to={accountPath} className="text-gray-700 hover:underline">
                {expense.accountName} &rarr;
              </Link>
            ) : (
              expense.accountName || "—"
            )}
          </div>
          {expense.place && <div><span className="font-semibold">{t("expensePlace")}:</span> {expense.place}</div>}
          <div><span className="font-semibold">{t("expenseDate")}:</span> {formatDate(expense.date, lang)}</div>
          {expense.note && <div><span className="font-semibold">{t("expenseNote")}:</span> {expense.note}</div>}

          {/* The review trail: each entry appears once it has happened. */}
          {expense.submittedAt && (
            <div>
              <span className="font-semibold">{t("expenseDateLabelSubmitted")}:</span>{" "}
              {formatDate(expense.submittedAt, lang)}
            </div>
          )}
          {expense.rejectedByName && (
            <div>
              <span className="font-semibold">{t("expenseRejectedBy")}:</span> {expense.rejectedByName}
            </div>
          )}
          {expense.rejectedAt && (
            <div>
              <span className="font-semibold">{t("expenseDateLabelRejected")}:</span>{" "}
              {formatDate(expense.rejectedAt, lang)}
            </div>
          )}
          {expense.confirmedByName && (
            <div>
              <span className="font-semibold">{t("expenseConfirmedBy")}:</span> {expense.confirmedByName}
            </div>
          )}
          {expense.confirmedAt && (
            <div>
              <span className="font-semibold">{t("expenseDateLabelConfirmed")}:</span>{" "}
              {formatDate(expense.confirmedAt, lang)}
            </div>
          )}
          {expense.bookkeepingAccount && (
            <div>
              <span className="font-semibold">{t("expenseBookkeepingAccount")}:</span>{" "}
              {expense.bookkeepingAccount}
            </div>
          )}
          {expense.reimbursedDate && (
            <div>
              <span className="font-semibold">{t("expenseReimbursedDate")}:</span>{" "}
              {formatDate(expense.reimbursedDate, lang)}
            </div>
          )}

          {/* Reviewing someone else's submitted expense. The owner never gets
              here — reviewing your own is refused server-side too. */}
          {expense.canApprove ? (
            <>
              <div className="flex items-start gap-2 p-3 mt-2 bg-blue-50 border border-blue-300 rounded-lg text-blue-800">
                <InformationCircleIcon className="w-5 h-5 flex-shrink-0" />
                <span>{t("expenseApproveHint")}</span>
              </div>
              <div className="flex gap-3">
                <Button
                  className="flex-1"
                  disabled={actionLoading}
                  onClick={() => run(onApprove)}
                >
                  {t("expenseApprove")}
                </Button>
                <Button
                  variant="danger"
                  className="flex-1"
                  disabled={actionLoading}
                  onClick={() => setShowRejectReason(true)}
                >
                  {t("expenseReject")}
                </Button>
              </div>
              {showRejectReason && (
                <div className="flex flex-col gap-2 p-3 border border-red-300 rounded-lg bg-red-50">
                  <label htmlFor="rejectReason" className="font-semibold">
                    {t("expenseRejectionReason")}
                  </label>
                  <textarea
                    id="rejectReason"
                    rows={3}
                    className="bg-surface border border-black rounded py-2.5 px-3 text-base font-mono w-full box-border focus:outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/20"
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                  />
                  <p className="text-sm text-gray-600">{t("expenseRejectReasonHint")}</p>
                  <div className="flex gap-3">
                    <Button
                      variant="danger"
                      className="flex-1"
                      disabled={actionLoading || !rejectReason.trim()}
                      onClick={() => run(() => onReject(rejectReason.trim()))}
                    >
                      {t("expenseRejectConfirm")}
                    </Button>
                    <Button
                      variant="secondary"
                      className="flex-1"
                      disabled={actionLoading}
                      onClick={() => {
                        setShowRejectReason(false);
                        setRejectReason("");
                      }}
                    >
                      {t("cancel")}
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : isReviewer ? (
            /* Already reviewed, or not this reviewer's to act on: nothing to
               offer — the status and the reason above say it all. */
            null
          ) : expense.status === "submitted" ? (
            <>
              <div className="flex items-start gap-2 p-3 mt-2 bg-yellow-50 border border-yellow-300 rounded-lg text-yellow-800">
                <InformationCircleIcon className="w-5 h-5 flex-shrink-0" />
                <span>{t("expenseRetractHint")}</span>
              </div>
              <Button
                variant="secondary"
                fullWidth
                disabled={actionLoading}
                onClick={() => run(onRetract)}
              >
                {t("expenseRetract")}
              </Button>
            </>
          ) : (
            <p className="text-gray-500 mt-2">{t("expenseLocked")}</p>
          )}
        </div>
      )}
    </MainContent>
  );
};

ExpenseDetail.propTypes = {
  loading: PropTypes.bool,
  error: PropTypes.string,
  expense: PropTypes.object,
  accounts: PropTypes.array,
  placeSuggestions: PropTypes.array,
  receiptUrl: PropTypes.string,
  onSave: PropTypes.func,
  onSubmit: PropTypes.func,
  onRetract: PropTypes.func,
  onAbort: PropTypes.func,
  onReplacePhoto: PropTypes.func,
  onApprove: PropTypes.func,
  onReject: PropTypes.func,
};

ExpenseDetail.defaultProps = {
  loading: false,
  error: null,
  expense: null,
  accounts: [],
  placeSuggestions: [],
  receiptUrl: null,
  onSave: () => {},
  onSubmit: () => {},
  onRetract: () => {},
  onAbort: () => {},
  onReplacePhoto: () => {},
  onApprove: () => {},
  onReject: () => {},
};

export default ExpenseDetail;
