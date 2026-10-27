import React from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import MainContent from "../../../components/MainContent";
import Loader from "../../../components/Loader";
import { localized } from "/imports/common/lib/groupRules";

/** The activities, what the association usually does, with a link to add one for those who may. */
const Activities = ({ loading, activities, canCreateActivity }) => {
  const { t, i18n } = useTranslation();
  const lang = i18n.language || "sv";
  return (
    <MainContent>
      {loading ? <Loader /> : (
        <>
          {canCreateActivity && (
            <div className="flex justify-end mb-3">
              <Link to="/activities/new" className="text-sm font-semibold text-brand-green no-underline hover:underline">+ {t("activityNew")}</Link>
            </div>
          )}
          {activities.length === 0 ? (
            <p className="text-gray-500 text-center p-6">{t("activitiesNone")}</p>
          ) : (
            <ul className="list-none p-0 m-0">
              {activities.map((activity) => (
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
                        {[localized(activity.categoryName, lang), localized(activity.groupName, lang) || t("activityAssociation")]
                          .filter(Boolean).join(" · ")}
                      </span>
                    </div>
                    <span className="text-gray-400 text-xl ml-2">&rarr;</span>
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
};

Activities.defaultProps = {
  loading: false,
  activities: [],
  canCreateActivity: false,
};

export default Activities;
