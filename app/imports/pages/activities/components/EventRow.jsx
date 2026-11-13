import React from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { localized } from "/imports/common/lib/groupRules";
import { eventTimes, eventWhen, plainText } from "./format";
import { StatePill } from "./RegistrationBox";

/**
 * One event in a list: when, what, where; cancelled ones struck through. In
 * a list by day (`timesOnly`) the day is the list's, and the row says the times
 * and, after them, the workshop when there is one; below the name the start of
 * the description, as much as fits on a line, instead of the place and group.
 */
const EventRow = ({ event, timesOnly = false }) => {
  const { t, i18n } = useTranslation();
  const lang = i18n.language || "sv";
  const cancelled = event.status === "cancelled";
  const seats = !cancelled && !event.myState && event.registration !== "none" && event.seatsLeft !== null && event.seatsLeft !== undefined;
  const badges = [
    !cancelled && event.myState && <StatePill key="mine" state={event.myState} />,
    seats && (
      <span key="seats" className={`text-xs font-semibold whitespace-nowrap ${event.seatsLeft === 0 ? "text-red-700" : "text-gray-500"}`}>
        {event.seatsLeft === 0 ? t("registrationFullShort") : t("registrationSeatsLeftShort", { count: event.seatsLeft })}
      </span>
    ),
    event.status === "awaiting" && !cancelled && (
      <span key="awaiting" className="text-xs font-semibold rounded-full py-0.5 px-2 bg-amber-100 text-amber-800 whitespace-nowrap">
        {t("eventAwaiting")}
      </span>
    ),
    cancelled && (
      <span key="cancelled" className="text-xs font-semibold rounded-full py-0.5 px-2 bg-red-100 text-red-800 whitespace-nowrap">
        {t("eventCancelled")}
      </span>
    ),
  ].filter(Boolean);
  return (
    <li className="mb-2">
      <Link
        to={`/events/${event._id}`}
        className="flex justify-between items-center p-3 rounded-lg bg-white border border-gray-200 no-underline text-inherit hover:bg-gray-50"
      >
        <div className="flex-1 min-w-0">
          {/* On one line: a soft hyphen in a name (Trä­verkstaden) would otherwise break it in two. */}
          <span className="block text-xs text-gray-500 whitespace-nowrap truncate">
            {timesOnly
              ? [eventTimes(event, lang), event.workshopId && localized(event.workshopName, lang)].filter(Boolean).join(" · ")
              : eventWhen(event, lang)}
          </span>
          {/* A long word (Träverkstadsintroduktion) breaks rather than run past the row. */}
          <span className={`block font-semibold leading-snug break-words ${cancelled ? "line-through text-gray-500" : ""}`}>
            {localized(event.name, lang)}
          </span>
          {timesOnly ? (
            plainText(localized(event.description, lang)) && (
              <span className="block text-xs text-gray-500 mt-0.5 truncate">{plainText(localized(event.description, lang))}</span>
            )
          ) : (event.spaceName || event.groupName) && (
            <span className="block text-xs text-gray-500 mt-0.5">
              {[localized(event.spaceName, lang), localized(event.groupName, lang)].filter(Boolean).join(" · ")}
            </span>
          )}
          {/* Where one stands, the seats and the event's state: on a line of
              their own below, so that the name and times keep the row's width. */}
          {badges.length > 0 && <span className="flex flex-wrap items-center justify-end gap-2 mt-1">{badges}</span>}
        </div>
        <span className="text-gray-400 text-xl ml-2">&rarr;</span>
      </Link>
    </li>
  );
};

EventRow.propTypes = {
  event: PropTypes.object.isRequired,
  timesOnly: PropTypes.bool,
};

export default EventRow;
