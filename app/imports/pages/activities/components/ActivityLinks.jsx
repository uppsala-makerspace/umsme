import React from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { localized } from "/imports/common/lib/groupRules";

/** Activities as links, each with the number of its planned events. */
export const ActivityList = ({ activities }) => {
  const { t, i18n } = useTranslation();
  const lang = i18n.language || "sv";
  return (
    <ul className="list-none p-0 m-0">
      {activities.map((activity) => (
        <li key={activity._id} className="mb-2">
          <Link
            to={`/activities/${activity._id}`}
            className="flex justify-between items-center p-3 rounded-lg bg-white border border-gray-200 no-underline text-inherit hover:bg-gray-50"
          >
            <span className="font-semibold">{localized(activity.name, lang)}</span>
            <span className="flex items-center ml-2">
              <span
                title={t("activityPlannedEvents", { count: activity.plannedEvents || 0 })}
                aria-label={t("activityPlannedEvents", { count: activity.plannedEvents || 0 })}
                className={`min-w-6 h-6 px-2 rounded-full text-xs font-semibold flex items-center justify-center ${
                  activity.plannedEvents ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-500"
                }`}
              >
                {activity.plannedEvents || 0}
              </span>
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
