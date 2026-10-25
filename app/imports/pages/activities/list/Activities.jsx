import React from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ChevronDownIcon } from "@heroicons/react/20/solid";
import MainContent from "../../../components/MainContent";
import Loader from "../../../components/Loader";
import Tabs from "../../../components/Tabs";
import { localized } from "/imports/common/lib/groupRules";
import EventRow from "../components/EventRow";

export const TABS = ["events", "activities"];
export const WHENS = ["upcoming", "past", "mine"];

const AddLink = ({ to, children }) => (
  <Link to={to} className="text-sm font-semibold text-brand-green no-underline hover:underline">
    {children}
  </Link>
);

/**
 * Events and activities, in two tabs. The events are those to come, soonest
 * first, or those past, latest first, a page at a time with a button for
 * more. Links to add either for those who may.
 */
const Activities = ({
  tab, onTab, when, onWhen,
  events, eventsLoading, hasMore, loadingMore, onLoadMore,
  loading, activities, canCreateActivity, canCreateEvent,
}) => {
  const { t, i18n } = useTranslation();
  const lang = i18n.language || "sv";

  const eventsTab = (
    <>
      <div className="flex items-center justify-between gap-3 mb-3">
        {/* Its own chevron, not the browser's, which sits close to the edge. */}
        <div className="relative">
          <select
            aria-label={t("eventsWhen")}
            value={when}
            onChange={(e) => onWhen(e.target.value)}
            className="appearance-none bg-white border border-gray-300 rounded py-2 pl-3 pr-10 text-sm font-semibold text-gray-700 cursor-pointer"
          >
            {WHENS.map((option) => (
              <option key={option} value={option}>{t({ upcoming: "upcomingEvents", past: "pastEvents", mine: "eventsMine" }[option])}</option>
            ))}
          </select>
          <ChevronDownIcon className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" aria-hidden="true" />
        </div>
        {canCreateEvent && when === "upcoming" && <AddLink to="/events/new">+ {t("eventNew")}</AddLink>}
      </div>
      {eventsLoading ? (
        <Loader />
      ) : events.length === 0 ? (
        <p className="text-gray-500 text-center p-6">{t({ past: "activitiesNoPast", mine: "eventsMineNone" }[when] || "activitiesNoUpcoming")}</p>
      ) : (
        <>
          <ul className="list-none p-0 m-0">
            {events.map((event) => <EventRow key={event._id} event={event} />)}
          </ul>
          {hasMore && (
            <button
              type="button"
              onClick={onLoadMore}
              disabled={loadingMore}
              className="w-full py-2 bg-transparent border-none text-[#5fc86f] hover:text-[#096817] disabled:text-gray-400 cursor-pointer disabled:cursor-default"
            >
              {loadingMore ? t("loading") : t("eventsLoadMore")}
            </button>
          )}
        </>
      )}
    </>
  );

  const activitiesTab = loading ? <Loader /> : (
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
  );

  return (
    <MainContent>
      <Tabs
        tabs={[
          { key: "events", label: t("activitiesTabEvents") },
          { key: "activities", label: t("activitiesTabActivities") },
        ]}
        activeTab={tab}
        onTabChange={onTab}
      />
      {tab === "activities" ? activitiesTab : eventsTab}
    </MainContent>
  );
};

Activities.propTypes = {
  tab: PropTypes.oneOf(TABS).isRequired,
  onTab: PropTypes.func.isRequired,
  when: PropTypes.oneOf(WHENS).isRequired,
  onWhen: PropTypes.func.isRequired,
  events: PropTypes.array,
  eventsLoading: PropTypes.bool,
  hasMore: PropTypes.bool,
  loadingMore: PropTypes.bool,
  onLoadMore: PropTypes.func,
  loading: PropTypes.bool,
  activities: PropTypes.array,
  canCreateActivity: PropTypes.bool,
  canCreateEvent: PropTypes.bool,
};

Activities.defaultProps = {
  events: [],
  eventsLoading: false,
  hasMore: false,
  loadingMore: false,
  loading: false,
  activities: [],
  canCreateActivity: false,
  canCreateEvent: false,
};

export default Activities;
