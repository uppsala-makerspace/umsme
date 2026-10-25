import React, { useState } from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import MainContent from "../../../components/MainContent";
import Loader from "../../../components/Loader";
import Tabs from "../../../components/Tabs";
import { localized } from "/imports/common/lib/groupRules";
import EventRow from "../components/EventRow";

const TABS = ["upcoming", "all"];

const AddLink = ({ to, children }) => (
  <Link to={to} className="text-sm font-semibold text-brand-green no-underline hover:underline">
    {children}
  </Link>
);

/**
 * Activities and events: the events to come, soonest first, and every
 * activity. Links to add either for those who may.
 */
const Activities = ({ loading, activities, events, canCreateActivity, canCreateEvent, initialTab }) => {
  const { t, i18n } = useTranslation();
  const lang = i18n.language || "sv";
  const [tab, setTab] = useState(TABS.includes(initialTab) ? initialTab : "upcoming");

  if (loading) {
    return (
      <MainContent>
        <Loader />
      </MainContent>
    );
  }

  return (
    <MainContent>
      <Tabs
        tabs={[
          { key: "upcoming", label: t("activitiesUpcoming") },
          { key: "all", label: t("activitiesAll") },
        ]}
        activeTab={tab}
        onTabChange={setTab}
      />
      {tab === "upcoming" ? (
        <>
          {canCreateEvent && (
            <div className="flex justify-end mb-3">
              <AddLink to="/events/new">+ {t("eventNew")}</AddLink>
            </div>
          )}
          {events.length === 0 ? (
            <p className="text-gray-500 text-center p-6">{t("activitiesNoUpcoming")}</p>
          ) : (
            <ul className="list-none p-0 m-0">
              {events.map((event) => <EventRow key={event._id} event={event} />)}
            </ul>
          )}
        </>
      ) : (
        <>
          {canCreateActivity && (
            <div className="flex justify-end mb-3">
              <AddLink to="/activities/new">+ {t("activityNew")}</AddLink>
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
  events: PropTypes.array,
  canCreateActivity: PropTypes.bool,
  canCreateEvent: PropTypes.bool,
  initialTab: PropTypes.oneOf(TABS),
};

Activities.defaultProps = {
  loading: false,
  activities: [],
  events: [],
  canCreateActivity: false,
  canCreateEvent: false,
};

export default Activities;
