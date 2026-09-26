import React, { useState } from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ChevronDownIcon } from "@heroicons/react/24/outline";
import Loader from "../../../components/Loader";
import { formatDate } from "../utils";
import { localized } from "/imports/common/lib/groupRules";
import {
  BUDGET_SPENT_MODES,
  DEFAULT_BUDGET_SPENT_MODE,
  spentFor,
  remaining,
} from "/imports/common/lib/expenseBudget";

const kr = (amount) => `${Math.round((amount || 0) * 100) / 100} kr`;

/** A native select with our own arrow, styled like the account page's year picker. */
const Select = ({ id, label, value, onChange, children, className = "", selectClassName = "" }) => (
  <div className={className}>
    <label htmlFor={id} className="block text-sm text-gray-600 mb-1">
      {label}
    </label>
    <div className="relative">
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`appearance-none w-full p-2 pr-9 border border-gray-300 rounded-lg bg-white ${selectClassName}`}
      >
        {children}
      </select>
      <ChevronDownIcon
        className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
        aria-hidden="true"
      />
    </div>
  </div>
);

/** Reimbursed amounts per bookkeeping account, e.g. "6110 Kontorsmateriel  1200 kr". */
const BookkeepingRows = ({ rows, className = "" }) => (
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

/**
 * Budget view of the expense accounts tab: per account, the year's budget,
 * what is spent against it and what is left. How "spent" is counted is the
 * viewer's choice — approved and paid by default — and changes only the
 * arithmetic, so it is local state rather than a new fetch.
 */
const AccountBudgets = ({ loading, error, year, availableYears, accounts, bookkeeping, onYearChange }) => {
  const { t, i18n } = useTranslation();
  const lang = i18n.language || "sv";
  const [mode, setMode] = useState(DEFAULT_BUDGET_SPENT_MODE);

  return (
    <div>
      {/* The spent-mode labels are long, so that select gets a row of its own. */}
      <div className="flex flex-wrap items-start gap-3 mb-4">
        <Select
          id="budgetYear"
          label={t("expenseYear")}
          value={year}
          onChange={(v) => onYearChange(Number(v))}
          className="flex-none"
        >
          {availableYears.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </Select>
        <Select
          id="budgetSpentMode"
          label={t("expenseBudgetCountAs")}
          value={mode}
          onChange={setMode}
          className="basis-full"
          selectClassName="text-sm"
        >
          {Object.keys(BUDGET_SPENT_MODES).map((m) => (
            <option key={m} value={m}>
              {t(`expenseBudgetMode_${m}`)}
            </option>
          ))}
        </Select>
      </div>

      {loading ? (
        <Loader />
      ) : error ? (
        <p className="text-red-600 text-center p-8">{error}</p>
      ) : accounts.length === 0 ? (
        <p className="text-center text-gray-500 p-8 italic">{t("expenseNoAccounts")}</p>
      ) : (
        <>
        {/* Where the year's reimbursements were booked, across every account
            shown. The bookkeeping account is picked at reimbursement, so this
            counts reimbursed expenses whatever the dropdown says. */}
        {bookkeeping.length > 0 && (
          <section className="mb-4 p-4 rounded-lg bg-white border border-gray-200">
            <h4 className="text-sm font-semibold text-gray-700 m-0 mb-2">{t("expenseBudgetBooked")}</h4>
            <BookkeepingRows rows={bookkeeping} className="text-sm text-gray-700" />
          </section>
        )}
        <ul className="list-none p-0 m-0">
          {accounts.map((a) => {
            const spent = spentFor(a.totals, mode);
            const left = remaining(a.budget, spent);
            const hasBudget = a.budget !== null;
            const over = hasBudget && left < 0;
            // A zero budget with spending is fully used; with nothing spent it is empty.
            const share = hasBudget
              ? a.budget > 0 ? Math.min(spent / a.budget, 1) : spent > 0 ? 1 : 0
              : 0;
            return (
              <li key={a._id} className="mb-3">
                <Link
                  to={`/expense-accounts/${a._id}`}
                  className="block p-4 rounded-lg bg-white border border-gray-200 no-underline text-inherit hover:bg-gray-50"
                >
                  <span className="block font-semibold leading-snug">{a.name}</span>
                  {a.groupNames.length > 0 && (
                    <span className="block text-xs text-gray-500 mt-0.5">
                      {a.groupNames.map((n) => localized(n, lang)).join(", ")}
                    </span>
                  )}

                  {hasBudget ? (
                    <>
                      <span className="flex justify-between items-baseline mt-3">
                        <span className="text-sm text-gray-600">{t("expenseBudgetRemaining")}</span>
                        <span className={`text-lg font-semibold ${over ? "text-red-600" : "text-gray-900"}`}>
                          {kr(left)}
                        </span>
                      </span>
                      <span
                        className="block h-2 mt-2 rounded-full bg-gray-100 overflow-hidden"
                        role="progressbar"
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={Math.round(share * 100)}
                      >
                        <span
                          className={`block h-full rounded-full ${over ? "bg-red-500" : "bg-brand-green"}`}
                          style={{ width: `${share * 100}%` }}
                        />
                      </span>
                      <span className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>
                          {t("expenseBudgetSpent")} {kr(spent)}
                        </span>
                        <span>
                          {t("expenseBudget")} {kr(a.budget)}
                        </span>
                      </span>
                      {a.lastRevision && a.lastRevision.count > 1 && (
                        <span className="block text-xs text-gray-500 mt-2">
                          {t("expenseBudgetRevised", { date: formatDate(a.lastRevision.setAt, lang) })}
                          {a.lastRevision.comment && <>: {a.lastRevision.comment}</>}
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="flex justify-between items-baseline mt-3">
                      <span className="text-sm text-gray-500 italic">{t("expenseBudgetNone")}</span>
                      <span className="text-sm text-gray-600">
                        {t("expenseBudgetSpent")} {kr(spent)}
                      </span>
                    </span>
                  )}
                  {a.bookkeeping?.length > 0 && (
                    <span className="block mt-3 pt-2 border-t border-gray-100 text-xs text-gray-500">
                      <span className="block mb-0.5">{t("expenseBudgetBooked")}</span>
                      <BookkeepingRows rows={a.bookkeeping} />
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
        </>
      )}
    </div>
  );
};

AccountBudgets.propTypes = {
  loading: PropTypes.bool,
  error: PropTypes.string,
  year: PropTypes.number.isRequired,
  availableYears: PropTypes.arrayOf(PropTypes.number),
  accounts: PropTypes.arrayOf(
    PropTypes.shape({
      _id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
      groupNames: PropTypes.array,
      budget: PropTypes.number,
      lastRevision: PropTypes.shape({
        setAt: PropTypes.oneOfType([PropTypes.instanceOf(Date), PropTypes.string]),
        comment: PropTypes.string,
        setByName: PropTypes.string,
        count: PropTypes.number,
      }),
      totals: PropTypes.object,
      bookkeeping: PropTypes.array,
    })
  ),
  // Reimbursed amounts per bookkeeping account: [{ account, name, amount }].
  bookkeeping: PropTypes.arrayOf(
    PropTypes.shape({
      account: PropTypes.string.isRequired,
      name: PropTypes.string,
      amount: PropTypes.number.isRequired,
    })
  ),
  onYearChange: PropTypes.func,
};

AccountBudgets.defaultProps = {
  loading: false,
  error: null,
  availableYears: [],
  accounts: [],
  bookkeeping: [],
  onYearChange: () => {},
};

export default AccountBudgets;
