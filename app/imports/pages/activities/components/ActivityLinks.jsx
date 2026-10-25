import React from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { localized } from "/imports/common/lib/groupRules";

/**
 * The activities of a workshop or a group, as a section of its page, each
 * with the number of its planned events; nothing when there are none.
 */
const ActivityLinks = ({ activities }) => {
  const { t, i18n } = useTranslation();
  const lang = i18n.language || "sv";
  if (!activities?.length) return null;
  return (
    <section className="mb-6">
      <h3 className="text-lg mb-2 text-gray-700 border-b border-gray-200 pb-2">{t("activities")}</h3>
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
    </section>
  );
};

ActivityLinks.propTypes = {
  activities: PropTypes.arrayOf(PropTypes.shape({ _id: PropTypes.string, name: PropTypes.object, plannedEvents: PropTypes.number })),
};

export default ActivityLinks;
