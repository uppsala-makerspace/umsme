import React from "react";
import PropTypes from "prop-types";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import MainContent from "../../../components/MainContent";
import Loader from "../../../components/Loader";
import Button from "../../../components/Button";
import ExpenseItem from "../components/ExpenseItem";
import { EXPENSE_STATUSES, formatDate } from "../utils";

const Expenses = ({ loading, error, expenses }) => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const lang = i18n.language || "sv";

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

  return (
    <MainContent topPadding={false}>
      <h2 className="text-2xl mb-6 text-center">{t("expenses")}</h2>

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
              {byStatus[status].map((e) => (
                <ExpenseItem key={e._id} to={`/expenses/${e._id}`} status={e.status}>
                  <span className="flex items-center font-semibold leading-snug">
                    {e.accountName || t("expenseDraft")}
                  </span>
                  <span className="block text-sm text-gray-500 mt-1">
                    {e.amount ? `${e.amount} kr` : t("expenseNoAmount")} · {formatDate(e.date, lang)}
                  </span>
                </ExpenseItem>
              ))}
            </ul>
          </section>
        ) : null
      )}
    </MainContent>
  );
};

Expenses.propTypes = {
  loading: PropTypes.bool,
  error: PropTypes.string,
  expenses: PropTypes.array,
};

Expenses.defaultProps = {
  loading: false,
  error: null,
  expenses: [],
};

export default Expenses;
