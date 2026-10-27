import React from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import MainContent from "../../../components/MainContent";
import Loader from "../../../components/Loader";
import { localized } from "/imports/common/lib/groupRules";
import { PlannedCount } from "../components/ActivityLinks";
import FilterSelect from "../components/FilterSelect";

/** The filter's choice for activities shown at no workshop: the makerspace as a whole. */
export const NO_WORKSHOP = "none";

const workshopOf = (activity) => activity.workshopId || NO_WORKSHOP;

/**
 * The activities, what the association usually does, each with the workshop
 * it is shown at ("Makerspace" for none) and the number of its planned events
 * as on a workshop's page. A filter by workshop (`workshop`: a workshop's id,
 * NO_WORKSHOP, or "" for all) among those the activities are at, and a link to
 * add one for those who may.
 */
const Activities = ({ loading, activities, canCreateActivity, workshop, onWorkshop }) => {
  const { t, i18n } = useTranslation();
  const lang = i18n.language || "sv";
  const workshopName = (activity) => (activity.workshopId ? localized(activity.workshopName, lang) : t("activityNoWorkshop"));
  const workshops = [...new Map(activities.map((a) => [workshopOf(a), workshopName(a)])).entries()]
    .sort(([a, nameA], [b, nameB]) => (a === NO_WORKSHOP) - (b === NO_WORKSHOP) || nameA.localeCompare(nameB, lang));
  const shown = workshop ? activities.filter((a) => workshopOf(a) === workshop) : activities;
  return (
    <MainContent>
      {loading ? <Loader /> : (
        <>
          <div className="flex items-center justify-between gap-3 mb-3">
            {workshops.length > 1 ? (
              <FilterSelect
                label={t("activitiesWorkshopFilter")} value={workshop} onChange={onWorkshop}
                options={[{ value: "", label: t("activitiesAllWorkshops") }, ...workshops.map(([value, label]) => ({ value, label }))]}
              />
            ) : <span />}
            {canCreateActivity && (
              <Link to="/activities/new" className="text-sm font-semibold text-brand-green no-underline hover:underline">+ {t("activityNew")}</Link>
            )}
          </div>
          {shown.length === 0 ? (
            <p className="text-gray-500 text-center p-6">{t("activitiesNone")}</p>
          ) : (
            <ul className="list-none p-0 m-0">
              {shown.map((activity) => (
                <li key={activity._id} className="mb-2">
                  <Link
                    to={`/activities/${activity._id}`}
                    className="flex items-center gap-3 p-3 rounded-lg bg-white border border-gray-200 no-underline text-inherit hover:bg-gray-50"
                  >
                    {activity.imageUrl && (
                      <img src={activity.imageUrl} alt="" className="w-12 h-12 object-cover rounded flex-shrink-0" />
                    )}
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
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </MainContent>
  );
};

Activities.propTypes = {
  loading: PropTypes.bool,
  activities: PropTypes.array,
  canCreateActivity: PropTypes.bool,
  workshop: PropTypes.string,
  onWorkshop: PropTypes.func,
};

Activities.defaultProps = {
  loading: false,
  activities: [],
  canCreateActivity: false,
  workshop: "",
  onWorkshop: () => {},
};

export default Activities;
