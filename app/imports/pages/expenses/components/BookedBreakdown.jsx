import React from "react";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import { ChevronDownIcon, ChevronUpIcon } from "@heroicons/react/24/outline";

const kr = (amount) => `${Math.round((amount || 0) * 100) / 100} kr`;

/** Reimbursed amounts per bookkeeping account, e.g. "6110 Kontorsmateriel  1200 kr". */
export const BookkeepingRows = ({ rows, className = "" }) => (
  <span className={`block ${className}`}>
    {rows.map((r) => (
      <span key={r.account} className="flex justify-between gap-3">
        <span className="min-w-0 truncate">
          {r.account}
          {r.name && ` ${r.name}`}
        </span>
        <span className="whitespace-nowrap">{kr(r.amount)}</span>
      </span>
    ))}
  </span>
);

BookkeepingRows.propTypes = {
  rows: PropTypes.arrayOf(
    PropTypes.shape({ account: PropTypes.string.isRequired, name: PropTypes.string, amount: PropTypes.number })
  ).isRequired,
  className: PropTypes.string,
};

/**
 * Group reimbursed expenses by bookkeeping account, for a list of expense DTOs
 * that carry `bookkeepingAccount` and `bookkeepingAccountName`.
 */
export const bookkeepingRowsFor = (expenses) => {
  const byAccount = {};
  for (const e of expenses) {
    if (e.status !== "reimbursed" || !e.bookkeepingAccount) continue;
    const row = (byAccount[e.bookkeepingAccount] ||= {
      account: e.bookkeepingAccount,
      name: e.bookkeepingAccountName || null,
      amount: 0,
    });
    row.amount += e.amount || 0;
  }
  return Object.values(byAccount).sort((a, b) => a.account.localeCompare(b.account));
};

/**
 * The fold-out control for a card's "booked at reimbursement" breakdown: a
 * chevron meant for the card's top-right corner. The caller keeps the open
 * state and places `BookedPanel` where the breakdown should appear.
 */
export const BookedToggle = ({ open, onToggle, className = "" }) => {
  const { t } = useTranslation();
  const Icon = open ? ChevronUpIcon : ChevronDownIcon;
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      aria-label={t("expenseBudgetBooked")}
      title={t("expenseBudgetBooked")}
      className={`flex items-center justify-center w-8 h-8 p-0 rounded-full bg-transparent border-none text-gray-400 cursor-pointer hover:bg-gray-100 hover:text-gray-700 ${className}`}
    >
      <Icon className="w-5 h-5" aria-hidden="true" />
    </button>
  );
};

BookedToggle.propTypes = {
  open: PropTypes.bool.isRequired,
  onToggle: PropTypes.func.isRequired,
  className: PropTypes.string,
};

/**
 * The opened breakdown: a rule, the heading with the total, and the amounts
 * per bookkeeping account. Only rendered while open, so a closed card shows
 * neither rule nor heading.
 */
export const BookedPanel = ({ rows, className = "" }) => {
  const { t } = useTranslation();
  const total = rows.reduce((sum, r) => sum + (r.amount || 0), 0);
  return (
    <div className={`pt-2 border-t border-gray-100 text-xs text-gray-500 ${className}`}>
      <span className="flex justify-between gap-3 font-semibold text-gray-700 mb-0.5">
        <span>{t("expenseBudgetBooked")}</span>
        <span className="whitespace-nowrap">{kr(total)}</span>
      </span>
      <BookkeepingRows rows={rows} />
    </div>
  );
};

BookedPanel.propTypes = {
  rows: PropTypes.array.isRequired,
  className: PropTypes.string,
};
