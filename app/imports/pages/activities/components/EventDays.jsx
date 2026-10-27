import React from "react";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import EventRow from "./EventRow";
import { eventDay, monthOf, weekdayAndDay } from "./format";

const dayKey = (date) => new Date(date).toDateString();
const monthKey = (date) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${d.getMonth()}`;
};

/** The events in their order, in runs of the same day, each run under the month it falls in when that changes. */
const byDay = (events) => {
  const days = [];
  for (const event of events) {
    const last = days[days.length - 1];
    if (last && last.key === dayKey(event.start)) last.events.push(event);
    else days.push({ key: dayKey(event.start), date: event.start, newMonth: !last || monthKey(last.date) !== monthKey(event.start), events: [event] });
  }
  return days;
};

/**
 * Events by day, as a phone's calendar shows them: a bubble with the weekday
 * and the day of the month to the left of a day's first event, the day's
 * events beside it, the month above when it changes. Today's bubble is green.
 * In whatever order the events come: soonest or latest first.
 */
const EventDays = ({ events }) => {
  const { i18n } = useTranslation();
  const lang = i18n.language || "sv";
  const today = dayKey(new Date());
  return (
    <div>
      {byDay(events).map(({ key, date, newMonth, events: ofDay }) => {
        const { weekday, day } = weekdayAndDay(date, lang);
        const isToday = key === today;
        return (
          <React.Fragment key={key}>
            {newMonth && <h3 className="text-sm font-semibold text-gray-500 mt-4 mb-2 first:mt-0 first-letter:uppercase">{monthOf(date, lang)}</h3>}
            <div className="flex gap-3">
              <div
                className={`flex-shrink-0 w-12 h-14 rounded-xl flex flex-col items-center justify-center leading-none ${
                  isToday ? "bg-brand-green text-white" : "bg-sky-50 text-sky-900"
                }`}
                aria-hidden="true"
              >
                <span className="text-xs">{weekday}</span>
                <span className="text-xl font-bold mt-0.5">{day}</span>
              </div>
              <div className="flex-1 min-w-0">
                {/* The day for those who do not see the bubble. */}
                <span className="sr-only">{eventDay(date, lang)}</span>
                <ul className="list-none p-0 m-0">
                  {ofDay.map((event) => <EventRow key={event._id} event={event} timesOnly />)}
                </ul>
              </div>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
};

EventDays.propTypes = {
  events: PropTypes.array.isRequired,
};

export default EventDays;
