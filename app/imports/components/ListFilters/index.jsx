import React from "react";
import { useTranslation } from "react-i18next";
import { ChevronDownIcon, FunnelIcon, QueueListIcon, Squares2X2Icon } from "@heroicons/react/24/outline";
import CheckboxDropdown from "../CheckboxDropdown";

/**
 * The pieces of a list's search row and filter section, shared by the groups
 * and the activities: the button switching between the detailed and the
 * compact list, the filter button that opens the section below the row, the
 * section with its dropdowns of checkboxes, and a button clearing the filter.
 */

const iconButton = "flex-shrink-0 rounded border cursor-pointer hover:bg-gray-50";

/** Switches between the detailed list (with images) and the compact one. */
export const ViewToggle = ({ compact, onToggle }) => {
  const { t } = useTranslation();
  const Icon = compact ? Squares2X2Icon : QueueListIcon;
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={compact ? t("moreInfo") : t("lessInfo")}
      title={compact ? t("moreInfo") : t("lessInfo")}
      className={`${iconButton} p-2.5 bg-white border-gray-200 text-gray-600`}
    >
      <Icon className="w-6 h-6" aria-hidden="true" />
    </button>
  );
};

/**
 * Opens and closes the filter section (`controls` is its id). A green dot
 * tells that the filter is not the standard one, a chevron whether the
 * section is open. `label` and `activeLabel` name it without and with a filter.
 */
export const FilterButton = ({ open, onToggle, filtered, controls, label, activeLabel }) => (
  <button
    type="button"
    onClick={onToggle}
    aria-expanded={open}
    aria-controls={controls}
    aria-label={filtered ? activeLabel : label}
    title={filtered ? activeLabel : label}
    className={`${iconButton} flex items-center gap-0.5 py-2.5 pl-2.5 pr-1.5 ${
      open ? "bg-gray-100 border-gray-300 text-gray-800" : "bg-white border-gray-200 text-gray-600"
    }`}
  >
    <span className="relative block">
      <FunnelIcon className="w-6 h-6" aria-hidden="true" />
      {filtered && (
        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-brand-green" aria-hidden="true" />
      )}
    </span>
    <ChevronDownIcon className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
  </button>
);

/** The filter section under the search row: its dropdowns, and Clear filters while filtered. */
export const FilterSection = ({ id, filtered, onClear, children }) => {
  const { t } = useTranslation();
  return (
    <div id={id} className="mb-4 rounded-lg border border-gray-200 bg-white p-3">
      <div className="flex flex-col sm:flex-row gap-3">{children}</div>
      {filtered && (
        <div className="mt-3 text-right">
          <button
            type="button"
            onClick={onClear}
            className="bg-transparent border-none p-0 text-sm text-gray-600 underline cursor-pointer hover:text-gray-900"
          >
            {t("filterClear")}
          </button>
        </div>
      )}
    </div>
  );
};

/**
 * One filter of the section: its name above a button that says what is
 * chosen, opening the checkboxes (CheckboxDropdown).
 */
export const FilterDropdown = ({ id, label, summary, options, selected, onToggle }) => (
  <div className="flex-1 min-w-0">
    <span id={id} className="block text-xs font-semibold uppercase text-gray-500 mb-1">
      {label}
    </span>
    <CheckboxDropdown
      options={options}
      selected={selected}
      onToggle={onToggle}
      panelClassName="min-w-max"
      renderTrigger={({ open, toggle }) => (
        <button
          type="button"
          onClick={toggle}
          aria-expanded={open}
          aria-labelledby={id}
          className="w-full flex items-center justify-between gap-2 p-2 border border-gray-300 rounded-lg bg-white text-left text-sm cursor-pointer"
        >
          <span className="truncate">{summary}</span>
          <ChevronDownIcon className="w-4 h-4 flex-shrink-0 text-gray-400" aria-hidden="true" />
        </button>
      )}
    />
  </div>
);

/**
 * What a dropdown's button says: all, none, or the chosen ones by name.
 * Without `all` every choice is named, as where none chosen means all.
 */
export const filterSummary = (options, selected, { all = null, none }) => {
  const chosen = options.filter((o) => selected.includes(o.key));
  if (chosen.length === 0) return none;
  if (all && chosen.length === options.length) return all;
  return chosen.map((o) => o.label).join(", ");
};

/** `list` with `key` taken out if it is in, added if not. */
export const toggled = (list, key) => (list.includes(key) ? list.filter((k) => k !== key) : [...list, key]);
