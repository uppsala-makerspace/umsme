import React, { useState, useMemo } from "react";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import MainContent from "../../components/MainContent";
import Loader from "../../components/Loader";

const formatDate = (date, language) => {
  const locale = language === "sv" ? "sv-SE" : "en-US";
  return new Date(date).toLocaleDateString(locale);
};

const getTagLabel = (item, t) => {
  if (item.kind === "message") return t("tagPrivate");
  if (item.type === "newsletter") return t("tagNewsletter");
  if (item.type === "information") return t("tagInformation");
  return item.type || "";
};

const getTagClass = (item) => {
  if (item.kind === "message") return "bg-blue-100 text-blue-700";
  if (item.type === "newsletter") return "bg-green-100 text-green-700";
  return "bg-gray-100 text-gray-700";
};

const ALL_FILTERS = ["private", "newsletter", "information"];

const matchesFilter = (item, filters) => {
  if (item.kind === "message") return filters.includes("private");
  return filters.includes(item.type);
};

const Messages = ({ loading, items, lastSeen }) => {
  const { t, i18n } = useTranslation();
  const [showFilter, setShowFilter] = useState(false);
  const [filters, setFilters] = useState(ALL_FILTERS);

  const toggleFilter = (key) => {
    setFilters((prev) =>
      prev.includes(key) ? prev.filter((f) => f !== key) : [...prev, key]
    );
  };

  const visibleItems = useMemo(
    () => items.filter((item) => matchesFilter(item, filters)),
    [items, filters]
  );

  const counts = useMemo(() => {
    const c = { private: 0, newsletter: 0, information: 0 };
    items.forEach((item) => {
      if (item.kind === "message") c.private += 1;
      else if (item.type === "newsletter") c.newsletter += 1;
      else if (item.type === "information") c.information += 1;
    });
    return c;
  }, [items]);

  if (loading) {
    return <MainContent><Loader /></MainContent>;
  }

  const filtersActive = filters.length !== ALL_FILTERS.length;

  return (
    <MainContent>
      <div className="flex items-center justify-between mb-4">
        <h2 className="m-0">{t("messagesPageTitle")}</h2>
        <button
          type="button"
          onClick={() => setShowFilter((v) => !v)}
          aria-label={t("filter")}
          aria-expanded={showFilter}
          title={t("filter")}
          className={`flex items-center gap-1.5 text-sm px-3 py-1 rounded border ${filtersActive ? "border-brand-green text-brand-green" : "border-gray-300 text-gray-700"} bg-white cursor-pointer`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
          </svg>
          {filtersActive && <span>{filters.length}/{ALL_FILTERS.length}</span>}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="12" height="12" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" strokeWidth="2.5"
            strokeLinecap="round" strokeLinejoin="round"
            className={`transition-transform ${showFilter ? "rotate-180" : ""}`}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
      </div>

      {showFilter && (
        <div className="border border-gray-200 rounded p-3 mb-4 bg-gray-50 flex flex-col gap-2">
          <label className={`flex items-center gap-2 ${counts.private === 0 ? "text-gray-400 cursor-not-allowed" : "cursor-pointer"}`}>
            <input
              type="checkbox"
              checked={filters.includes("private")}
              disabled={counts.private === 0}
              onChange={() => toggleFilter("private")}
            />
            <span>{t("tagPrivate")} <span className="text-gray-500">({counts.private})</span></span>
          </label>
          <label className={`flex items-center gap-2 ${counts.newsletter === 0 ? "text-gray-400 cursor-not-allowed" : "cursor-pointer"}`}>
            <input
              type="checkbox"
              checked={filters.includes("newsletter")}
              disabled={counts.newsletter === 0}
              onChange={() => toggleFilter("newsletter")}
            />
            <span>{t("tagNewsletter")} <span className="text-gray-500">({counts.newsletter})</span></span>
          </label>
          <label className={`flex items-center gap-2 ${counts.information === 0 ? "text-gray-400 cursor-not-allowed" : "cursor-pointer"}`}>
            <input
              type="checkbox"
              checked={filters.includes("information")}
              disabled={counts.information === 0}
              onChange={() => toggleFilter("information")}
            />
            <span>{t("tagInformation")} <span className="text-gray-500">({counts.information})</span></span>
          </label>
        </div>
      )}

      {visibleItems.length === 0 ? (
        <p className="text-center text-gray-600 mt-5">{t("noMessages")}</p>
      ) : (
        <ul className="list-none p-0 flex flex-col gap-2">
          {visibleItems.map((item) => {
            const isNew = !lastSeen || new Date(item.date) > lastSeen;
            return (
              <li key={`${item.kind}-${item._id}`}>
                <Link
                  to={`/messages/${item.kind}/${item._id}`}
                  className="block no-underline text-inherit p-3 rounded border border-gray-200 bg-white hover:bg-gray-50"
                >
                  <div className="flex items-center gap-2 mb-1">
                    {isNew && (
                      <span className="inline-block w-2 h-2 rounded-full bg-brand-green flex-shrink-0" aria-label={t("newIndicator")}></span>
                    )}
                    <span className="font-medium">{item.subject}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded ${getTagClass(item)}`}>
                      {getTagLabel(item, t)}
                    </span>
                    <span className="text-xs text-gray-500">{formatDate(item.date, i18n.language)}</span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </MainContent>
  );
};

Messages.propTypes = {
  loading: PropTypes.bool,
  items: PropTypes.array.isRequired,
  lastSeen: PropTypes.instanceOf(Date),
};

export default Messages;
