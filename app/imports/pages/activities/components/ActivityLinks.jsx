import React from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { localized } from "/imports/common/lib/groupRules";

/** The number of an activity's planned events, green when there are any. */
export const PlannedCount = ({ count = 0 }) => {
  const { t } = useTranslation();
  return (
    <span
      title={t("activityPlannedEvents", { count })}
      aria-label={t("activityPlannedEvents", { count })}
      className={`min-w-6 h-6 px-2 rounded-full text-xs font-semibold flex items-center justify-center ${
        count ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-500"
      }`}
    >
      {count}
    </span>
  );
};

PlannedCount.propTypes = { count: PropTypes.number };

/**
 * Activities as links, each with the number of its planned events. Marked
 * (`marked`) with the activities' light blue and a blue edge, as a
 * workshop's steering group is with green, where they stand among events.
 */
export const ActivityList = ({ activities, marked = false }) => {
  const { i18n } = useTranslation();
  const lang = i18n.language || "sv";
  return (
    <ul className="list-none p-0 m-0">
      {activities.map((activity) => (
        <li key={activity._id} className="mb-2">
          <Link
            to={`/activities/${activity._id}`}
            className={`flex justify-between items-center p-3 rounded-lg border border-gray-200 no-underline text-inherit ${
            marked ? "border-l-4 border-l-sky-400 bg-sky-50 hover:bg-sky-100" : "bg-white hover:bg-gray-50"
          }`}
          >
            <span className="font-semibold">{localized(activity.name, lang)}</span>
            <span className="flex items-center ml-2">
              <PlannedCount count={activity.plannedEvents || 0} />
              <span className="text-gray-400 text-xl ml-2">&rarr;</span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
};

/**
 * The activities of a workshop or a group, as a section of its page, each
 * with the number of its planned events. Nothing when there are none, unless
 * `always` (a group's page, which owns them) or there is `addTo`: a link to
 * create one owned by that group.
 */
const ActivityLinks = ({ activities, always, addTo }) => {
  const { t, i18n } = useTranslation();
  const lang = i18n.language || "sv";
  if (!activities?.length && !always && !addTo) return null;
  return (
    <section className="mb-6">
      <div className="flex items-center border-b border-gray-200 pb-2 mb-2">
        <h3 className="text-lg m-0 text-gray-700">{t("activities")}</h3>
        {addTo && (
          <Link to={`/activities/new?group=${addTo}`} className="ml-auto text-sm font-semibold text-brand-green no-underline hover:underline">
            + {t("activityNew")}
          </Link>
        )}
      </div>
      {!activities?.length && <p className="text-gray-500 m-0">{t("activitiesNone")}</p>}
      <ActivityList activities={activities} />
    </section>
  );
};

ActivityLinks.propTypes = {
  always: PropTypes.bool,
  addTo: PropTypes.string,
  activities: PropTypes.arrayOf(PropTypes.shape({ _id: PropTypes.string, name: PropTypes.object, plannedEvents: PropTypes.number })),
};

export default ActivityLinks;
