import React from "react";
import { useTranslation } from "react-i18next";
import { remaining } from "/imports/common/lib/expenseBudget";

const kr = (amount) => `${Math.round((amount || 0) * 100) / 100} kr`;

/**
 * Spent amount, a bar for the share spent (red once overspent) and what is
 * left and the budget under it. `large` is the summary's bigger variant.
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
        <span className="text-sm text-gray-600">{t("expenseBudgetSpent")}</span>
        <span
          className={`font-semibold ${large ? "text-2xl" : "text-lg"} ${
            over ? "text-red-600" : "text-gray-900"
          }`}
        >
          {kr(spent)}
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
        <span className={over ? "text-red-600" : ""}>
          {t("expenseBudgetRemaining")} {kr(left)}
        </span>
        <span>
          {t("expenseBudget")} {kr(budget)}
        </span>
      </span>
    </>
  );
};

export default BudgetBar;
