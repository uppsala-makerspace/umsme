import React, { useState } from "react";
import PropTypes from "prop-types";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ChevronDownIcon, ChevronUpIcon, PhotoIcon } from "@heroicons/react/24/outline";
import MainContent from "../../components/MainContent";
import Loader from "../../components/Loader";
import Button from "../../components/Button";
import CheckboxDropdown from "../../components/CheckboxDropdown";
import { formatDate, statusDate } from "../expenses/utils";

// Same status accents as the member's own expense list (ExpenseItem).
const statusAccent = {
  submitted: "border-l-blue-500",
  rejected: "border-l-red-500 bg-red-50",
  confirmed: "border-l-[#5fc86f]",
  reimbursed: "border-l-gray-400 bg-green-50",
};

// The three totals shown above the list, in workflow order.
const SUMMED_STATUSES = ["reimbursed", "confirmed", "submitted"];

// The statuses an account's expenses can have (a pending draft never reaches
// this page), in workflow order. Confirmed and reimbursed are on by default:
// what the account has actually committed to, without the noise of expenses
// still under review or turned down.
const FILTER_STATUSES = ["submitted", "rejected", "confirmed", "reimbursed"];
const DEFAULT_STATUSES = ["confirmed", "reimbursed"];

const NOTE_MAX = 140;
const truncate = (text) =>
  text && text.length > NOTE_MAX ? `${text.slice(0, NOTE_MAX).trimEnd()}…` : text;

const dash = (value) => (value === null || value === undefined || value === "" ? "—" : value);

const kr = (amount) => `${Math.round((amount || 0) * 100) / 100} kr`;

/**
 * The status filter's trigger: a button sized and styled like the year picker
 * beside it, showing a summary of the selection. The popover itself comes from
 * CheckboxDropdown, shared with the group list.
 */
const StatusFilterTrigger = ({ open, toggle, summary }) => (
  <button
    type="button"
    aria-expanded={open}
    onClick={toggle}
    className="w-full flex items-center justify-between gap-2 p-2 border border-gray-300 rounded-lg bg-white text-left cursor-pointer"
  >
    <span className="truncate">{summary}</span>
    <ChevronDownIcon className="w-4 h-4 flex-shrink-0 text-gray-400" aria-hidden="true" />
  </button>
);

const AccountExpenses = ({ loading, error, data, newExpenseTo, expenseTo, onYearChange }) => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const lang = i18n.language || "sv";
  const [expanded, setExpanded] = useState({});
  // The expense whose receipt is shown in the dialog, if any.
  const [receipt, setReceipt] = useState(null);
  // Which statuses to list. Purely client-side: the year filter decides what
  // the server sends, this decides what is shown of it.
  const [statuses, setStatuses] = useState(DEFAULT_STATUSES);

  if (loading) {
    return (
      <MainContent>
        <Loader />
      </MainContent>
    );
  }

  if (error || !data?.account) {
    return (
      <MainContent>
        <p className="text-center text-red-600 p-8">{error || t("expenseNotFound")}</p>
      </MainContent>
    );
  }

  const { account, expenses = [], availableYears = [], year } = data;

  // The totals stay a summary of the whole year, whatever the status filter
  // hides — they are what the account stands at, not what is on screen.
  const totals = Object.fromEntries(
    SUMMED_STATUSES.map((status) => [
      status,
      expenses
        .filter((e) => e.status === status)
        .reduce((sum, e) => sum + (e.amount || 0), 0),
    ])
  );

  const shown = expenses.filter((e) => statuses.includes(e.status));

  const toggle = (id) => setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  const toggleStatus = (status) =>
    setStatuses((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]
    );

  // Naming the single choice beats "1 vald"; beyond that the labels are too
  // long to list, so fall back to a count.
  const statusSummary =
    statuses.length === FILTER_STATUSES.length
      ? t("expenseAllStatuses")
      : statuses.length === 0
        ? t("expenseNoStatuses")
        : statuses.length === 1
          ? t(`expenseStatus_${statuses[0]}`)
          // `n`, not `count`: the latter would pull in i18next's plural
          // machinery, and this string never needs it.
          : t("expenseStatusesSelected", { n: statuses.length });

  return (
    <MainContent>
      <h2 className="text-2xl m-0 mb-1">{account.name}</h2>
      <p className="text-sm text-gray-500 mt-0 mb-4">{t("expenseAccount")}</p>

      {newExpenseTo && (
        <div className="mb-6">
          <Button fullWidth onClick={() => navigate(newExpenseTo)}>
            {t("expenseNew")}
          </Button>
        </div>
      )}

      {/* Year and status side by side: the year picker keeps its natural
          width, the status filter takes the rest. */}
      <div className="flex flex-wrap items-start gap-3 mb-4">
        <div className="flex-none">
          <label htmlFor="expenseYear" className="block text-sm text-gray-600 mb-1">
            {t("expenseYear")}
          </label>
          {/* The native arrow is dropped for our own, so the two controls
              match — the browser's differs per platform. */}
          <div className="relative">
            <select
              id="expenseYear"
              value={year || ""}
              onChange={(e) => onYearChange(e.target.value ? Number(e.target.value) : null)}
              className="appearance-none p-2 pr-9 border border-gray-300 rounded-lg bg-white"
            >
              <option value="">{t("expenseAllYears")}</option>
              {availableYears.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
            <ChevronDownIcon
              className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
              aria-hidden="true"
            />
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <span className="block text-sm text-gray-600 mb-1">{t("expenseStatusFilter")}</span>
          <CheckboxDropdown
            options={FILTER_STATUSES.map((status) => ({
              key: status,
              label: t(`expenseStatus_${status}`),
            }))}
            selected={statuses}
            onToggle={toggleStatus}
            panelClassName="w-full min-w-max"
            renderTrigger={({ open, toggle }) => (
              <StatusFilterTrigger open={open} toggle={toggle} summary={statusSummary} />
            )}
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-6">
        {SUMMED_STATUSES.map((status) => (
          <div key={status} className="p-3 rounded-lg bg-white border border-gray-200 text-center">
            <span className="block text-xs text-gray-500">{t(`expenseStatus_${status}`)}</span>
            <span className="block font-semibold mt-1">{kr(totals[status])}</span>
          </div>
        ))}
      </div>

      {shown.length === 0 ? (
        <p className="text-center text-gray-500 p-8 italic">
          {/* Distinguish "the year is empty" from "the filter hides it all" —
              otherwise deselecting every status looks like missing data. */}
          {expenses.length === 0 ? t("expenseNoneForYear") : t("expenseNoneForFilter")}
        </p>
      ) : (
        <ul className="list-none p-0 m-0">
          {shown.map((e) => {
            const isOpen = !!expanded[e._id];
            // The label is the singular status name and the date is the one
            // that status change refers to.
            const dated = statusDate(e);
            const canOpen = !!expenseTo && e.isMine;
            return (
              <li
                key={e._id}
                className={`mb-3 rounded-lg bg-white border border-gray-200 border-l-4 ${
                  statusAccent[e.status] || "border-l-gray-300"
                }`}
              >
                <button
                  type="button"
                  onClick={() => toggle(e._id)}
                  aria-expanded={isOpen}
                  className="w-full flex items-center gap-3 p-4 bg-transparent border-none text-left cursor-pointer"
                >
                  <span className="flex-1 min-w-0">
                    <span className="block font-semibold leading-snug truncate">{e.memberName}</span>
                    <span className="block text-xs text-gray-500 mt-1">
                      {t(dated.labelKey)} · {formatDate(dated.value, lang)}
                    </span>
                  </span>
                  <span className="font-semibold whitespace-nowrap">{kr(e.amount)}</span>
                  {isOpen ? (
                    <ChevronUpIcon className="w-4 h-4 flex-shrink-0 text-gray-400" aria-hidden="true" />
                  ) : (
                    <ChevronDownIcon className="w-4 h-4 flex-shrink-0 text-gray-400" aria-hidden="true" />
                  )}
                </button>

                {isOpen && (
                  <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 m-0 px-4 pb-4 text-sm">
                    <dt className="text-gray-500">{t("expenseDate")}</dt>
                    <dd className="m-0">{formatDate(e.date, lang)}</dd>
                    <dt className="text-gray-500">{t("expensePlace")}</dt>
                    <dd className="m-0">{dash(e.place)}</dd>
                    <dt className="text-gray-500">{t("expenseNote")}</dt>
                    <dd className="m-0 break-words">{dash(truncate(e.note))}</dd>
                    {/* Status timeline — a row only once it has happened. */}
                    {e.submittedAt && (
                      <>
                        <dt className="text-gray-500">{t("expenseDateLabelSubmitted")}</dt>
                        <dd className="m-0">{formatDate(e.submittedAt, lang)}</dd>
                      </>
                    )}
                    {e.rejectedAt && (
                      <>
                        <dt className="text-gray-500">{t("expenseDateLabelRejected")}</dt>
                        <dd className="m-0">{formatDate(e.rejectedAt, lang)}</dd>
                      </>
                    )}
                    {e.confirmedByName && (
                      <>
                        <dt className="text-gray-500">{t("expenseConfirmedBy")}</dt>
                        <dd className="m-0">{e.confirmedByName}</dd>
                      </>
                    )}
                    {e.confirmedAt && (
                      <>
                        <dt className="text-gray-500">{t("expenseDateLabelConfirmed")}</dt>
                        <dd className="m-0">{formatDate(e.confirmedAt, lang)}</dd>
                      </>
                    )}
                    {e.bookkeepingAccount && (
                      <>
                        <dt className="text-gray-500">{t("expenseBookkeepingAccount")}</dt>
                        <dd className="m-0">{e.bookkeepingAccount}</dd>
                      </>
                    )}
                    {e.reimbursedDate && (
                      <>
                        <dt className="text-gray-500">{t("expenseReimbursedDate")}</dt>
                        <dd className="m-0">{formatDate(e.reimbursedDate, lang)}</dd>
                      </>
                    )}
                  </dl>
                )}

                {isOpen && (e.receiptUrl || canOpen) && (
                  <div className="flex items-center justify-between gap-3 px-4 pb-4">
                    {e.receiptUrl ? (
                      <button
                        type="button"
                        onClick={() => setReceipt(e)}
                        className="flex items-center gap-2 p-0 bg-transparent border-none text-sm text-gray-600 underline cursor-pointer hover:text-black"
                      >
                        <PhotoIcon className="w-5 h-5" aria-hidden="true" />
                        {t("expenseShowReceipt")}
                      </button>
                    ) : (
                      <span />
                    )}
                    {canOpen && (
                      <Link
                        to={expenseTo(e._id)}
                        className="flex items-center gap-1 text-sm text-gray-600 underline hover:text-black"
                      >
                        {t("show")} &rarr;
                      </Link>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {/* Receipt dialog — same pattern as the terms dialog in paymentSelection:
          click the backdrop or Close to dismiss. */}
      {receipt && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 p-4 pt-16 pb-24"
          onClick={() => setReceipt(null)}
        >
          <div
            className="bg-white rounded-lg max-w-2xl w-full max-h-full flex flex-col"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-2 border-b">
              <h2 className="text-lg font-semibold truncate">
                {receipt.memberName} · {formatDate(receipt.date, lang)}
              </h2>
              <button
                type="button"
                onClick={() => setReceipt(null)}
                aria-label={t("close")}
                className="text-gray-500 hover:text-gray-700 text-2xl leading-none bg-transparent border-none cursor-pointer"
              >
                &times;
              </button>
            </div>
            <div className="p-4 overflow-y-auto">
              <a href={receipt.receiptUrl} target="_blank" rel="noreferrer">
                <img
                  src={receipt.receiptUrl}
                  alt={t("expenseReceipt")}
                  className="w-full rounded border border-gray-200"
                />
              </a>
            </div>
            <div className="p-4 border-t">
              <Button onClick={() => setReceipt(null)} fullWidth>
                {t("close")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </MainContent>
  );
};

AccountExpenses.propTypes = {
  loading: PropTypes.bool,
  error: PropTypes.string,
  data: PropTypes.object,
  newExpenseTo: PropTypes.string,
  expenseTo: PropTypes.func,
  onYearChange: PropTypes.func,
};

AccountExpenses.defaultProps = {
  loading: false,
  error: null,
  data: null,
  newExpenseTo: null,
  expenseTo: null,
  onYearChange: () => {},
};

export default AccountExpenses;
