import React from "react";
import PropTypes from "prop-types";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import MainContent from "../../../components/MainContent";
import Loader from "../../../components/Loader";
import Button from "../../../components/Button";
import Tabs from "../../../components/Tabs";
import ExpenseItem from "../components/ExpenseItem";
import { EXPENSE_STATUSES, formatDate, statusDate } from "../utils";
import { localized } from "/imports/common/lib/groupRules";

const Expenses = ({
  loading,
  error,
  expenses,
  isApprover,
  toApprove,
  recentlyReviewed,
  accounts,
}) => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const lang = i18n.language || "sv";
  // The tab lives in the URL rather than in state, so coming back from an
  // account or an expense lands on the tab you left from — the back arrow does
  // navigate(-1), which restores the query string with it.
  const [searchParams, setSearchParams] = useSearchParams();

  if (loading) {
    return (
      <MainContent>
        <Loader />
      </MainContent>
    );
  }

  if (error) {
    return (
      <MainContent>
        <p className="text-red-600 text-center p-8">{error}</p>
      </MainContent>
    );
  }

  const byStatus = Object.fromEntries(EXPENSE_STATUSES.map((s) => [s, []]));
  for (const e of expenses) {
    (byStatus[e.status] || (byStatus[e.status] = [])).push(e);
  }

  // A row in the review tab: the submitter's name leads, since that is what
  // distinguishes the entries from each other here.
  const reviewRow = (e) => (
    <ExpenseItem key={e._id} to={`/expenses/${e._id}`} status={e.status}>
      <span className="block font-semibold leading-snug truncate">{e.submitterName}</span>
      <span className="block text-sm text-gray-500 mt-0.5 truncate">
        {e.note || t("expenseUntitled", { date: formatDate(e.date, lang) })}
      </span>
      <span className="inline-block rounded-full bg-gray-100 text-gray-700 text-xs px-2 py-1 mt-1">
        {e.accountName || t("expenseDraft")}
      </span>
      <div className="flex justify-between gap-3 text-sm text-gray-500 mt-1">
        <span>{e.amount ? `${e.amount} kr` : t("expenseNoAmount")}</span>
        <span className="whitespace-nowrap text-gray-600">
          <span className="text-gray-400">{t(statusDate(e).labelKey)}</span>{" "}
          {formatDate(statusDate(e).value, lang)}
        </span>
      </div>
    </ExpenseItem>
  );

  // Two tabs for most members, three for approvers. The labels are kept short
  // deliberately: at three tabs each gets a third of a phone's width, and the
  // page is already titled Utlägg, so repeating the word in every tab buys
  // nothing.
  const tabs = [
    { key: "mine", label: t("myExpensesTab") },
    isApprover && {
      key: "approve",
      label: t("expensesToApproveTab"),
      badge: toApprove.length > 0 ? toApprove.length : undefined,
    },
    { key: "accounts", label: t("expenseAccountsTab") },
  ].filter(Boolean);

  // Unknown or not-available (?tab=approve without approval rights) falls back
  // to the default rather than showing nothing.
  const requested = searchParams.get("tab");
  const activeTab = tabs.some((tab) => tab.key === requested) ? requested : "mine";
  // replace, not push: switching tabs should not make the back arrow walk back
  // through them. The default tab drops the parameter so the URL stays clean,
  // and any other parameter is carried over untouched.
  const setActiveTab = (key) => {
    const next = new URLSearchParams(searchParams);
    if (key === "mine") next.delete("tab");
    else next.set("tab", key);
    setSearchParams(next, { replace: true });
  };

  return (
    <MainContent topPadding={false}>
      <Tabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

      {activeTab === "mine" && (
        <div>
          <div className="mb-8">
            <Button fullWidth onClick={() => navigate("/expenses/new")}>
              {t("expenseNew")}
            </Button>
          </div>

          {expenses.length === 0 && (
            <p className="text-center text-gray-500 p-8 italic">{t("expenseNone")}</p>
          )}

          {EXPENSE_STATUSES.map((status) =>
            byStatus[status].length > 0 ? (
              <section className="mb-8" key={status}>
                <h3 className="text-lg mb-4 text-gray-700 border-b border-gray-200 pb-2">
                  {t(`expenseStatus_${status}`)}
                </h3>
                <ul className="list-none p-0 m-0">
                  {byStatus[status].map((e) => {
                    const dated = statusDate(e);
                    return (
                      <ExpenseItem key={e._id} to={`/expenses/${e._id}`} status={e.status}>
                        <span className="block font-semibold leading-snug truncate">
                          {e.note || t("expenseUntitled", { date: formatDate(e.date, lang) })}
                        </span>
                        <span className="inline-block rounded-full bg-gray-100 text-gray-700 text-xs px-2 py-1 mt-1">
                          {e.accountName || t("expenseDraft")}
                        </span>
                        <div className="flex justify-between gap-3 text-sm text-gray-500 mt-1">
                          <span>{e.amount ? `${e.amount} kr` : t("expenseNoAmount")}</span>
                          <span className="whitespace-nowrap text-gray-600">
                            <span className="text-gray-400">{t(dated.labelKey)}</span>{" "}
                            {formatDate(dated.value, lang)}
                          </span>
                        </div>
                      </ExpenseItem>
                    );
                  })}
                </ul>
              </section>
            ) : null
          )}
        </div>
      )}

      {activeTab === "approve" && (
        <div>
          <section className="mb-8">
            <h3 className="text-lg mb-4 text-gray-700 border-b border-gray-200 pb-2">
              {t("expensesToApprove")}
            </h3>
            {toApprove.length === 0 ? (
              <p className="text-center text-gray-500 p-8 italic">{t("expenseNoneToApprove")}</p>
            ) : (
              <ul className="list-none p-0 m-0">{toApprove.map(reviewRow)}</ul>
            )}
          </section>

          {/* Just-reviewed expenses linger for a day so the reviewer can see
              the outcome of what they did. */}
          {recentlyReviewed.length > 0 && (
            <section className="mb-8">
              <h3 className="text-lg mb-4 text-gray-700 border-b border-gray-200 pb-2">
                {t("expensesRecentlyReviewed")}
              </h3>
              <ul className="list-none p-0 m-0">{recentlyReviewed.map(reviewRow)}</ul>
            </section>
          )}
        </div>
      )}

      {activeTab === "accounts" && (
        <section className="mb-8">
          <h3 className="text-lg mb-4 text-gray-700 border-b border-gray-200 pb-2">
            {t("expenseAccountsHeading")}
          </h3>
          {accounts.length === 0 ? (
            <p className="text-center text-gray-500 p-8 italic">{t("expenseNoAccounts")}</p>
          ) : (
            <ul className="list-none p-0 m-0">
              {accounts.map((a) => (
                <li key={a._id} className="mb-3">
                  <Link
                    to={`/expense-accounts/${a._id}`}
                    className="flex justify-between items-center gap-3 p-4 rounded-lg bg-white border border-gray-200 no-underline text-inherit hover:bg-gray-50"
                  >
                    <span className="flex-1 min-w-0">
                      <span className="block font-semibold leading-snug">{a.name}</span>
                      {/* Account names repeat across groups ("Förbrukning"),
                          so say whose the account is. */}
                      {a.groupNames.length > 0 && (
                        <span className="block text-xs text-gray-500 mt-0.5">
                          {a.groupNames.map((n) => localized(n, lang)).join(", ")}
                        </span>
                      )}
                      {a.explanation && (
                        <span className="block text-sm text-gray-500 mt-1">{a.explanation}</span>
                      )}
                      {/* A treasurer sees every account but may only charge
                          expenses to their own groups'. */}
                      {!a.canSpend && (
                        <span className="inline-block rounded-full bg-gray-100 text-gray-600 text-xs px-2 py-1 mt-2">
                          {t("expenseAccountViewOnly")}
                        </span>
                      )}
                    </span>
                    <span className="text-gray-400 text-xl">&rarr;</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </MainContent>
  );
};

Expenses.propTypes = {
  loading: PropTypes.bool,
  error: PropTypes.string,
  expenses: PropTypes.array,
  isApprover: PropTypes.bool,
  toApprove: PropTypes.array,
  recentlyReviewed: PropTypes.array,
  accounts: PropTypes.array,
};

Expenses.defaultProps = {
  loading: false,
  error: null,
  expenses: [],
  isApprover: false,
  toApprove: [],
  recentlyReviewed: [],
  accounts: [],
};

export default Expenses;
