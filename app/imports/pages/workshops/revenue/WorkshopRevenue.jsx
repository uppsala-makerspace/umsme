import React from "react";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import { ChevronDownIcon } from "@heroicons/react/24/outline";
import MainContent from "../../../components/MainContent";
import Loader from "../../../components/Loader";
import { formatDate } from "../../expenses/utils";

const kr = (amount) => `${Math.round((amount || 0) * 100) / 100} kr`;

const localized = (name, lang) => (name ? name[lang] || name.sv || name.en || "" : "");

/**
 * The web shop sales of a workshop's items, for its steering group: totals and
 * every payment with date, amount and the buyer's comment. Who paid is never
 * shown, and the server does not send it.
 */
const WorkshopRevenue = ({ loading, error, data, onYearChange }) => {
  const { t, i18n } = useTranslation();
  const lang = i18n.language || "sv";

  if (loading) {
    return (
      <MainContent>
        <Loader />
      </MainContent>
    );
  }

  if (error || !data?.workshop) {
    return (
      <MainContent>
        <p className="text-center text-red-600 p-8">{error || t("revenueNotFound")}</p>
      </MainContent>
    );
  }

  const { workshop, items = [], payments = [], availableYears = [], year, total, count } = data;
  const severalItems = items.length > 1;

  return (
    <MainContent>
      <h2 className="text-2xl m-0 mb-1">{localized(workshop.name, lang)}</h2>
      <p className="text-sm text-gray-500 mt-0 mb-4">{t("revenueTitle")}</p>

      {items.length === 0 ? (
        <p className="text-center text-gray-500 p-8 italic">{t("revenueNoItems")}</p>
      ) : (
        <>
          <div className="mb-4">
            <label htmlFor="revenueYear" className="block text-sm text-gray-600 mb-1">
              {t("expenseYear")}
            </label>
            <div className="relative inline-block">
              <select
                id="revenueYear"
                value={year || ""}
                onChange={(e) => onYearChange(e.target.value ? Number(e.target.value) : null)}
                className="appearance-none p-2 pr-9 border border-gray-300 rounded-lg bg-white"
              >
                <option value="">{t("expenseAllYears")}</option>
                {/* The selected year stays pickable even before it has a sale. */}
                {[...new Set([...(year ? [year] : []), ...availableYears])]
                  .sort((a, b) => b - a)
                  .map((y) => (
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

          <section className="mb-6 p-4 rounded-lg bg-white border border-gray-200">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-sm text-gray-600">{t("revenueTotal")}</span>
              <span className="text-xl font-semibold">{kr(total)}</span>
            </div>
            <span className="block text-xs text-gray-500 mt-1">{t("revenuePurchases", { count })}</span>
            {(severalItems || items.some((i) => i.sharedWith.length > 0)) && (
              <ul className="list-none p-0 m-0 mt-3 border-t border-gray-100">
                {items.map((item) => (
                  <li key={item._id} className="flex items-baseline justify-between gap-3 pt-2">
                    <span className="min-w-0">
                      <span className="block text-sm">{localized(item.name, lang)}</span>
                      {item.sharedWith.length > 0 && (
                        <span className="block text-xs text-gray-500">
                          {t("revenueSharedWith", { names: item.sharedWith.join(", ") })}
                        </span>
                      )}
                    </span>
                    <span className="text-sm whitespace-nowrap">
                      {kr(item.total)} <span className="text-gray-500">({item.count})</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <h3 className="text-lg font-semibold m-0 mb-3">{t("revenuePayments")}</h3>
          {payments.length === 0 ? (
            <p className="text-center text-gray-500 p-8 italic">{t("revenueNoneForPeriod")}</p>
          ) : (
            <ul className="list-none p-0 m-0">
              {payments.map((p) => (
                <li key={p._id} className="mb-2 p-3 rounded-lg bg-white border border-gray-200">
                  <div className="flex items-baseline justify-between gap-3">
                    {/* The item is always named: a workshop may sell several,
                        and one it sells today may get company later. */}
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold">{localized(p.itemName, lang)}</span>
                      <span className="block text-xs text-gray-500">{formatDate(p.date, lang)}</span>
                    </span>
                    <span className="font-semibold whitespace-nowrap">{kr(p.amount)}</span>
                  </div>
                  <p className={`text-sm m-0 mt-1 ${p.comment ? "" : "text-gray-400"}`}>
                    {p.comment || t("revenueNoComment")}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </MainContent>
  );
};

WorkshopRevenue.propTypes = {
  loading: PropTypes.bool,
  error: PropTypes.string,
  data: PropTypes.shape({
    workshop: PropTypes.object,
    items: PropTypes.array,
    payments: PropTypes.array,
    availableYears: PropTypes.array,
    year: PropTypes.number,
    total: PropTypes.number,
    count: PropTypes.number,
  }),
  onYearChange: PropTypes.func,
};

export default WorkshopRevenue;
