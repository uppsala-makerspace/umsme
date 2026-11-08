import React from "react";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import MainContent from "../../components/MainContent";

/**
 * "Switch user" for the admin account: search a member by name or member
 * number and view the app as them. Members without an app account are listed
 * but cannot be chosen — there is no login to switch to.
 */
const Impersonate = ({ query, onQueryChange, onSearch, searching, results, error, switchingTo, onSwitch }) => {
  const { t } = useTranslation();

  return (
    <MainContent>
      <h2 className="text-xl font-bold mb-1">{t("impersonationTitle")}</h2>
      <p className="text-sm text-gray-600 mt-0 mb-4">{t("impersonationIntro")}</p>

      <form
        className="flex gap-2 items-start"
        onSubmit={(event) => {
          event.preventDefault();
          onSearch();
        }}
      >
        <input
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder={t("impersonationSearchPlaceholder")}
          aria-label={t("impersonationSearchPlaceholder")}
          autoFocus
          className="flex-1 p-2 rounded-lg border border-gray-300"
        />
        <button
          type="submit"
          disabled={searching || !query.trim()}
          className="py-2 px-4 rounded-lg bg-brand-green text-white border-none cursor-pointer disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed"
        >
          {t("impersonationSearch")}
        </button>
      </form>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {results && results.length === 0 && !searching && (
        <p className="mt-4 text-gray-600">{t("impersonationNoResults")}</p>
      )}

      {results && results.length > 0 && (
        <ul className="list-none p-0 mt-4 divide-y divide-gray-200 border border-gray-200 rounded-lg">
          {results.map((r) => {
            const selectable = !!r.userId && !switchingTo;
            return (
              <li key={r.memberId}>
                <button
                  type="button"
                  disabled={!selectable}
                  onClick={() => onSwitch(r)}
                  className="w-full text-left bg-transparent border-none p-3 cursor-pointer disabled:cursor-not-allowed hover:bg-gray-50 disabled:hover:bg-transparent"
                >
                  <div className={`font-bold ${r.userId ? "" : "text-gray-400"}`}>
                    {r.name}
                    <span className="font-normal text-gray-500"> · {r.mid}</span>
                  </div>
                  <div className="text-sm text-gray-500 truncate">{r.email}</div>
                  {!r.userId && (
                    <div className="text-xs text-gray-400 mt-1">{t("impersonationNoAccount")}</div>
                  )}
                  {switchingTo === r.userId && (
                    <div className="text-xs text-brand-green mt-1">{t("impersonationSwitching")}</div>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </MainContent>
  );
};

Impersonate.propTypes = {
  query: PropTypes.string.isRequired,
  onQueryChange: PropTypes.func.isRequired,
  onSearch: PropTypes.func.isRequired,
  searching: PropTypes.bool,
  results: PropTypes.arrayOf(
    PropTypes.shape({
      memberId: PropTypes.string.isRequired,
      mid: PropTypes.string,
      name: PropTypes.string,
      email: PropTypes.string,
      userId: PropTypes.string,
    })
  ),
  error: PropTypes.string,
  switchingTo: PropTypes.string,
  onSwitch: PropTypes.func.isRequired,
};

export default Impersonate;
