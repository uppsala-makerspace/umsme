import React, { useState } from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ChevronDownIcon } from "@heroicons/react/24/outline";
import Loader from "../../../components/Loader";
import CheckboxDropdown from "../../../components/CheckboxDropdown";
import StatusFilterTrigger, { statusSummary } from "../components/StatusFilterTrigger";
import { formatDate, statusGroupKey } from "../utils";
import { localized } from "/imports/common/lib/groupRules";
import {
  BUDGET_SPENT_STATUSES,
  DEFAULT_BUDGET_SPENT_STATUSES,
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
 * Remaining amount, a bar for the share spent (red once overspent) and the
 * spent and budget figures under it. `large` is the summary's bigger variant.
 */
const BudgetBar = ({ budget, spent, large = false }) => {
  const { t } = useTranslation();
  const left = remaining(budget, spent);
  const over = left < 0;
  // A zero budget with spending is fully used; with nothing spent it is empty.
  const share = budget > 0 ? Math.min(spent / budget, 1) : spent > 0 ? 1 : 0;
  return (
    <>
      <span className={`flex justify-between items-baseline ${large ? "mt-2" : "mt-3"}`}>
        <span className="text-sm text-gray-600">{t("expenseBudgetRemaining")}</span>
        <span
          className={`font-semibold ${large ? "text-2xl" : "text-lg"} ${
            over ? "text-red-600" : "text-gray-900"
          }`}
        >
          {kr(left)}
        </span>
      </span>
      <span
        className={`block ${large ? "h-3" : "h-2"} mt-2 rounded-full bg-gray-200 overflow-hidden`}
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
      <span className={`flex justify-between text-gray-500 mt-1 ${large ? "text-sm" : "text-xs"}`}>
        <span>
          {t("expenseBudgetSpent")} {kr(spent)}
        </span>
        <span>
          {t("expenseBudget")} {kr(budget)}
        </span>
      </span>
    </>
  );
};

/**
 * Budget view of the expense accounts tab: per account, the year's budget,
 * what is spent against it and what is left. How "spent" is counted is the
 * viewer's choice of statuses — confirmed and reimbursed by default — and
 * changes only the arithmetic, so it is local state rather than a new fetch.
 */
const AccountBudgets = ({ loading, error, year, availableYears, accounts, bookkeeping, onYearChange }) => {
  const { t, i18n } = useTranslation();
  const lang = i18n.language || "sv";
  const [statuses, setStatuses] = useState(DEFAULT_BUDGET_SPENT_STATUSES);
  const toggleStatus = (status) =>
    setStatuses((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]
    );

  // Totals across every account shown: the budgets added up, and spending
  // split by whether the account has a budget to spend against.
  const summary = accounts.reduce(
    (acc, a) => {
      const spent = spentFor(a.totals, statuses);
      if (a.budget === null) return { ...acc, unbudgetedSpent: acc.unbudgetedSpent + spent };
      return { ...acc, budget: acc.budget + a.budget, spent: acc.spent + spent, budgeted: acc.budgeted + 1 };
    },
    { budget: 0, spent: 0, unbudgetedSpent: 0, budgeted: 0 }
  );

  return (
    <div>
      {/* Year on the left, what counts as spent on the right; both only as
          wide as their content. */}
      <div className="flex items-start justify-between gap-3 mb-4">
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
        <div className="flex-none">
          <span className="block text-sm text-gray-600 mb-1 text-right">{t("expenseBudgetCountAs")}</span>
          <CheckboxDropdown
            options={BUDGET_SPENT_STATUSES.map((status) => ({
              key: status,
              label: t(statusGroupKey(status)),
            }))}
            selected={statuses}
            onToggle={toggleStatus}
            align="right"
            panelClassName="min-w-max"
            renderTrigger={({ open, toggle }) => (
              <StatusFilterTrigger
                open={open}
                toggle={toggle}
                summary={statusSummary(t, statuses, BUDGET_SPENT_STATUSES)}
              />
            )}
          />
        </div>
      </div>

      {loading ? (
        <Loader />
      ) : error ? (
        <p className="text-red-600 text-center p-8">{error}</p>
      ) : accounts.length === 0 ? (
        <p className="text-center text-gray-500 p-8 italic">{t("expenseNoAccounts")}</p>
      ) : (
        <>
        {/* The whole picture first, set apart from the accounts by a rule
            rather than drawn as another card: all budgets together against
            what is spent on those accounts. Spending on accounts without a
            budget cannot eat into a budget, so it is reported beside it. */}
        <section className="mb-5 pb-5 border-b-2 border-gray-300">
          <h3 className="text-lg font-semibold m-0">{t("expenseBudgetTotal")}</h3>
          {summary.budgeted > 0 ? (
            <BudgetBar budget={summary.budget} spent={summary.spent} large />
          ) : (
            <span className="flex justify-between items-baseline mt-2">
              <span className="text-sm text-gray-500 italic">{t("expenseBudgetNoneAtAll")}</span>
            </span>
          )}
          {summary.unbudgetedSpent > 0 && (
            <p className="text-sm text-gray-500 mt-2 mb-0">
              {t(summary.budgeted > 0 ? "expenseBudgetUnbudgetedSpent" : "expenseBudgetSpentTotal", {
                amount: kr(summary.unbudgetedSpent),
              })}
            </p>
          )}
          {/* Where the year's reimbursements were booked, across every account
              shown. The bookkeeping account is picked at reimbursement, so this
              counts reimbursed expenses whatever the checkboxes say. */}
          {bookkeeping.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-semibold text-gray-700 m-0 mb-1">{t("expenseBudgetBooked")}</h4>
              <BookkeepingRows rows={bookkeeping} className="text-sm text-gray-700" />
            </div>
          )}
        </section>
        <ul className="list-none p-0 m-0">
          {accounts.map((a) => {
            const spent = spentFor(a.totals, statuses);
            const hasBudget = a.budget !== null;
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
                      <BudgetBar budget={a.budget} spent={spent} />
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
