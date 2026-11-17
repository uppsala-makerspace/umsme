import React, { useState } from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { PlusIcon } from "@heroicons/react/24/outline";
import MainContent from "../../../components/MainContent";
import Loader from "../../../components/Loader";
import Input from "../../../components/Input";
import {
  ViewToggle, FilterButton, FilterSection, FilterDropdown, filterSummary, toggled,
} from "../../../components/ListFilters";
import { localized } from "/imports/common/lib/groupRules";
import { PlannedCount } from "../components/ActivityLinks";

/** The filter's choice for activities shown at no workshop: the makerspace as a whole. */
export const NO_WORKSHOP = "none";

const workshopOf = (activity) => activity.workshopId || NO_WORKSHOP;

// Remembered detailed/compact choice, as on the groups list.
const COMPACT_KEY = "activitiesListCompact";

// Case-insensitive match against both languages of name and description.
const matchesSearch = (activity, needle) => !needle || [
  activity.name?.sv, activity.name?.en, activity.description?.sv, activity.description?.en,
].filter(Boolean).join("\n").toLowerCase().includes(needle);

/**
 * The activities, what the association usually does, each with the workshop
 * it is shown at ("Makerspace" for none), its category and group, and the
 * number of its planned events as on a workshop's page. A search box, a
 * detailed (with the image above) or compact list, and a filter section by
 * workshop (`workshops`: workshop ids and NO_WORKSHOP) and by category
 * (`categoryIds`), none chosen meaning all; `onFilter` gets both on a change.
 * A + to add an activity for those who may.
 */
const Activities = ({ loading, activities, categories, canCreateActivity, workshops, categoryIds, onFilter }) => {
  const { t, i18n } = useTranslation();
  const lang = i18n.language || "sv";
  const [search, setSearch] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [compact, setCompact] = useState(
    () => typeof localStorage !== "undefined" && localStorage.getItem(COMPACT_KEY) === "true"
  );
  const toggleCompact = () => {
    const next = !compact;
    setCompact(next);
    if (typeof localStorage !== "undefined") localStorage.setItem(COMPACT_KEY, String(next));
  };

  if (loading) {
    return (
      <MainContent>
        <Loader />
      </MainContent>
    );
  }

  const workshopName = (activity) => (activity.workshopId ? localized(activity.workshopName, lang) : t("activityNoWorkshop"));
  // The workshops the activities are at, the makerspace's last.
  const workshopOptions = [...new Map(activities.map((a) => [workshopOf(a), workshopName(a)])).entries()]
    .sort(([a, nameA], [b, nameB]) => (a === NO_WORKSHOP) - (b === NO_WORKSHOP) || nameA.localeCompare(nameB, lang))
    .map(([key, label]) => ({ key, label }));
  const categoryOptions = categories.map((c) => ({ key: c._id, label: localized(c.name, lang) }));
  // A choice no activity has any longer (from an old address) is left out, rather than hiding all.
  const activeWorkshops = workshops.filter((id) => workshopOptions.some((o) => o.key === id));
  const activeCategories = categoryIds.filter((id) => categoryOptions.some((o) => o.key === id));
  const filtered = activeWorkshops.length > 0 || activeCategories.length > 0;

  const needle = search.trim().toLowerCase();
  const shown = activities.filter((a) => matchesSearch(a, needle)
    && (activeWorkshops.length === 0 || activeWorkshops.includes(workshopOf(a)))
    && (activeCategories.length === 0 || activeCategories.includes(a.categoryId)));

  return (
    <MainContent>
      <div className="flex items-center gap-2 mb-4">
        <Input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("searchActivities")}
          aria-label={t("searchActivities")}
          className="mb-0 flex-1"
        />
        <ViewToggle compact={compact} onToggle={toggleCompact} />
        <FilterButton
          open={filtersOpen} onToggle={() => setFiltersOpen(!filtersOpen)} filtered={filtered}
          controls="activity-filters" label={t("activitiesFilter")} activeLabel={t("activitiesFilterActive")}
        />
        {canCreateActivity && (
          <Link
            to="/activities/new"
            aria-label={t("activityNew")}
            title={t("activityNew")}
            className="flex-shrink-0 p-2.5 rounded border border-brand-green bg-brand-green text-white hover:opacity-90"
          >
            <PlusIcon className="w-6 h-6 block" aria-hidden="true" />
          </Link>
        )}
      </div>

      {filtersOpen && (
        <FilterSection id="activity-filters" filtered={filtered} onClear={() => onFilter({ workshops: [], categoryIds: [] })}>
          <FilterDropdown
            id="activity-filter-workshops"
            label={t("filterWorkshops")}
            summary={filterSummary(workshopOptions, activeWorkshops, { none: t("filterAll") })}
            options={workshopOptions}
            selected={activeWorkshops}
            onToggle={(key) => onFilter({ workshops: toggled(activeWorkshops, key), categoryIds: activeCategories })}
          />
          {categoryOptions.length > 0 && (
            <FilterDropdown
              id="activity-filter-categories"
              label={t("filterCategories")}
              summary={filterSummary(categoryOptions, activeCategories, { none: t("filterAll") })}
              options={categoryOptions}
              selected={activeCategories}
              onToggle={(key) => onFilter({ workshops: activeWorkshops, categoryIds: toggled(activeCategories, key) })}
            />
          )}
        </FilterSection>
      )}

      {activities.length === 0 ? (
        <p className="text-gray-500 text-center p-6">{t("activitiesNone")}</p>
      ) : shown.length === 0 ? (
        <p className="text-gray-500 text-center p-6">{needle ? t("noActivitiesFound") : t("noActivitiesForFilter")}</p>
      ) : (
        <ul className="list-none p-0 m-0">
          {shown.map((activity) => (
            <li key={activity._id} className="mb-2 rounded-lg bg-white border border-gray-200 overflow-hidden">
              <Link to={`/activities/${activity._id}`} className="block no-underline text-inherit hover:bg-gray-50">
                {/* Detailed, the image above; compact, none. */}
                {!compact && activity.imageUrl && (
                  <img src={activity.imageUrl} alt="" className="w-full h-40 object-cover block" />
                )}
                <div className="flex items-center gap-3 p-3">
                  <div className="flex-1 min-w-0">
                    <span className="block font-semibold leading-snug">{localized(activity.name, lang)}</span>
                    <span className="block text-xs text-gray-500 mt-0.5">
                      {[workshopName(activity), localized(activity.categoryName, lang), localized(activity.groupName, lang) || t("activityAssociation")]
                        .filter(Boolean).join(" · ")}
                    </span>
                  </div>
                  <span className="flex items-center ml-2">
                    <PlannedCount count={activity.plannedEvents || 0} />
                    <span className="text-gray-400 text-xl ml-2">&rarr;</span>
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </MainContent>
  );
};

Activities.propTypes = {
  loading: PropTypes.bool,
  activities: PropTypes.array,
  categories: PropTypes.array,
  canCreateActivity: PropTypes.bool,
  workshops: PropTypes.arrayOf(PropTypes.string),
  categoryIds: PropTypes.arrayOf(PropTypes.string),
  onFilter: PropTypes.func,
};

Activities.defaultProps = {
  loading: false,
  activities: [],
  categories: [],
  canCreateActivity: false,
  workshops: [],
  categoryIds: [],
  onFilter: () => {},
};

export default Activities;
