import React from "react";
import { ChevronDownIcon } from "@heroicons/react/24/outline";
import { statusGroupKey } from "../utils";

/**
 * The trigger of a status filter: a button sized and styled like the year
 * picker beside it, showing a summary of the selection. The popover itself
 * comes from CheckboxDropdown. Used on the account page and the budget view.
 */
const StatusFilterTrigger = ({ open, toggle, summary }) => (
  <button
    type="button"
    aria-expanded={open}
    onClick={toggle}
    className="w-full flex items-center justify-between gap-2 p-2 border border-gray-300 rounded-lg bg-white text-left cursor-pointer"
  >
    <span className="truncate">{summary}</span>
    <ChevronDownIcon className="w-4 h-4 flex-shrink-0 text-gray-400" aria-hidden="true" />
  </button>
);

/**
 * Summary text for a status selection out of `all`. Naming the single choice
 * beats "1 vald"; beyond that the labels are too long to list, so it falls
 * back to a count.
 */
export const statusSummary = (t, selected, all) =>
  selected.length === all.length
    ? t("expenseAllStatuses")
    : selected.length === 0
      ? t("expenseNoStatuses")
      : selected.length === 1
        ? t(statusGroupKey(selected[0]))
        // `n`, not `count`: the latter would pull in i18next's plural
        // machinery, and this string never needs it.
        : t("expenseStatusesSelected", { n: selected.length });

export default StatusFilterTrigger;
