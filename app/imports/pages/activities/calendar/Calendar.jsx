import React from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ChevronDownIcon } from "@heroicons/react/20/solid";
import MainContent from "../../../components/MainContent";
import Loader from "../../../components/Loader";
import EventDays from "../components/EventDays";

export const WHENS = ["upcoming", "past", "mine"];

/**
 * The calendar: events to come, soonest first, those past, latest first, or
 * one's own registrations, by day, a page at a time with a button for more,
 * and a link to add one for those who may.
 */
const Calendar = ({ when, onWhen, events, loading, hasMore, loadingMore, onLoadMore, canCreateEvent }) => {
  const { t } = useTranslation();
  return (
    <MainContent>
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
        {canCreateEvent && when === "upcoming" && (
          <Link to="/events/new" className="text-sm font-semibold text-brand-green no-underline hover:underline">+ {t("eventNew")}</Link>
        )}
      </div>
      {loading ? (
        <Loader />
      ) : events.length === 0 ? (
        <p className="text-gray-500 text-center p-6">{t({ past: "activitiesNoPast", mine: "eventsMineNone" }[when] || "activitiesNoUpcoming")}</p>
      ) : (
        <>
          <EventDays events={events} />
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
    </MainContent>
  );
};

Calendar.propTypes = {
  when: PropTypes.oneOf(WHENS).isRequired,
  onWhen: PropTypes.func.isRequired,
  events: PropTypes.array,
  loading: PropTypes.bool,
  hasMore: PropTypes.bool,
  loadingMore: PropTypes.bool,
  onLoadMore: PropTypes.func,
  canCreateEvent: PropTypes.bool,
};

Calendar.defaultProps = {
  events: [],
  loading: false,
  hasMore: false,
  loadingMore: false,
  canCreateEvent: false,
};

export default Calendar;
