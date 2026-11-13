import React from "react";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import Tabs from "../../../components/Tabs";
import EventRow from "./EventRow";
import { ActivityList } from "./ActivityLinks";

export const WORKSHOP_TABS = ["calendar", "activities"];

/**
 * A workshop's or area of interest's calendar and activities, as two tabs
 * (`tab`, changed with `onTab`): its events to come, and its activities.
 * Without activities only the calendar, under its heading; with activities
 * but no events the calendar says none are planned and points to them. Nothing when it has
 * neither. The events come a page at a time: with `hasMore` a button loads
 * more (`onLoadMore`), as on the calendar.
 */
const WorkshopCalendar = ({ events, activities, tab = "calendar", onTab, hasMore = false, loadingMore = false, onLoadMore }) => {
  const { t } = useTranslation();
  if (!events?.length && !activities?.length) return null;
  const withActivities = activities?.length > 0;
  const shown = withActivities && tab === "activities" ? "activities" : "calendar";
  return (
    <section className="mb-6">
      {withActivities ? (
        <Tabs
          tabs={[
            { key: "calendar", label: t("navCalendar") },
            { key: "activities", label: t("workshopActivitiesTab", { count: activities.length }) },
          ]}
          activeTab={shown}
          onTabChange={onTab}
        />
      ) : (
        <h3 className="text-lg mb-2 text-gray-700 border-b border-gray-200 pb-2">{t("navCalendar")}</h3>
      )}
      {shown === "activities" ? (
        <ActivityList activities={activities} marked />
      ) : events?.length ? (
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
      ) : withActivities ? (
        // None planned: the activities say what there is, a tap away.
        <p className="text-gray-500 m-0 mb-2">
          {t("workshopNoPlannedEventsBefore")}
          <button type="button" onClick={() => onTab("activities")}
            className="p-0 bg-transparent border-none text-[#5fc86f] hover:text-[#096817] underline cursor-pointer">
            {t("workshopNoPlannedEventsSeeActivities")}
          </button>.
        </p>
      ) : (
        <p className="text-gray-500 m-0 mb-2">{t("workshopNoPlannedEvents")}</p>
      )}
    </section>
  );
};

WorkshopCalendar.propTypes = {
  events: PropTypes.array,
  activities: PropTypes.array,
  tab: PropTypes.oneOf(WORKSHOP_TABS),
  onTab: PropTypes.func,
  hasMore: PropTypes.bool,
  loadingMore: PropTypes.bool,
  onLoadMore: PropTypes.func,
};

export default WorkshopCalendar;
