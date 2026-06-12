import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import { PaperAirplaneIcon, InformationCircleIcon } from "@heroicons/react/24/outline";
import MainContent from "../../../components/MainContent";
import Loader from "../../../components/Loader";
import Button from "../../../components/Button";
import BackLink from "../../certificates/components/BackLink";
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
}) => {
  const { t, i18n } = useTranslation();
  const lang = i18n.language || "sv";
  const [amount, setAmount] = useState("");
  const [expenseAccountId, setExpenseAccountId] = useState("");
  const [place, setPlace] = useState("");
  const [date, setDate] = useState("");
  const [note, setNote] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

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
        <BackLink to="/expenses">{t("expenseBack")}</BackLink>
      </MainContent>
    );
  }

  const editable = isEditable(expense.status);
  const canSubmit = !!amount && Number(amount) > 0 && !!expenseAccountId;

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
      <BackLink to="/expenses">{t("expenseBack")}</BackLink>
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
              label={t("expenseReplacePhoto")}
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
              <span className="text-xs text-gray-500">
                {accounts.find((a) => a._id === expenseAccountId)?.explanation}
              </span>
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
          <div><span className="font-semibold">{t("expenseAmount")}:</span> {expense.amount} kr</div>
          <div><span className="font-semibold">{t("expenseAccount")}:</span> {expense.accountName || "—"}</div>
          {expense.place && <div><span className="font-semibold">{t("expensePlace")}:</span> {expense.place}</div>}
          <div><span className="font-semibold">{t("expenseDate")}:</span> {formatDate(expense.date, lang)}</div>
          {expense.note && <div><span className="font-semibold">{t("expenseNote")}:</span> {expense.note}</div>}

          {expense.status === "submitted" ? (
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
};

export default ExpenseDetail;
