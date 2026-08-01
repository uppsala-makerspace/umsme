import React, { useState } from "react";
import PropTypes from "prop-types";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import MainContent from "../../../components/MainContent";
import Loader from "../../../components/Loader";
import Button from "../../../components/Button";
import Tabs from "../../../components/Tabs";
import ExpenseItem from "../components/ExpenseItem";
import { EXPENSE_STATUSES, formatDate, statusDate } from "../utils";

const Expenses = ({ loading, error, expenses, isApprover, toApprove, recentlyReviewed }) => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const lang = i18n.language || "sv";
  const [activeTab, setActiveTab] = useState(location.state?.tab || "mine");

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

  return (
    <MainContent topPadding={!isApprover}>
      {/* The tab strip only appears for approvers; everyone else just sees
          their own expenses as before. */}
      {isApprover && (
        <Tabs
          tabs={[
            { key: "mine", label: t("myExpensesTab") },
            {
              key: "approve",
              label: t("expensesToApproveTab"),
              badge: toApprove.length > 0 ? toApprove.length : undefined,
            },
          ]}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
      )}

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
};

Expenses.defaultProps = {
  loading: false,
  error: null,
  expenses: [],
  isApprover: false,
  toApprove: [],
  recentlyReviewed: [],
};

export default Expenses;
