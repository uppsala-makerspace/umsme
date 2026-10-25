import React from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { localized } from "/imports/common/lib/groupRules";
import { eventWhen } from "./format";
import { StatePill } from "./RegistrationBox";

/** One event in a list: when, what, where; cancelled ones struck through. */
const EventRow = ({ event }) => {
  const { t, i18n } = useTranslation();
  const lang = i18n.language || "sv";
  const cancelled = event.status === "cancelled";
  return (
    <li className="mb-2">
      <Link
        to={`/events/${event._id}`}
        className="flex justify-between items-center p-3 rounded-lg bg-white border border-gray-200 no-underline text-inherit hover:bg-gray-50"
      >
        <div className="flex-1 min-w-0">
          <span className="block text-xs text-gray-500">{eventWhen(event, lang)}</span>
          <span className={`block font-semibold leading-snug ${cancelled ? "line-through text-gray-500" : ""}`}>
            {localized(event.name, lang)}
          </span>
          {(event.spaceName || event.groupName) && (
            <span className="block text-xs text-gray-500 mt-0.5">
              {[localized(event.spaceName, lang), localized(event.groupName, lang)].filter(Boolean).join(" · ")}
            </span>
          )}
        </div>
        {!cancelled && event.myState && <span className="flex-shrink-0 ml-2"><StatePill state={event.myState} /></span>}
        {!cancelled && !event.myState && event.registration !== "none" && event.seatsLeft !== null && event.seatsLeft !== undefined && (
          <span className={`flex-shrink-0 ml-2 text-xs font-semibold ${event.seatsLeft === 0 ? "text-red-700" : "text-gray-500"}`}>
            {event.seatsLeft === 0 ? t("registrationFullShort") : t("registrationSeatsLeftShort", { count: event.seatsLeft })}
          </span>
        )}
        {event.status === "awaiting" && !cancelled && (
          <span className="flex-shrink-0 text-xs font-semibold rounded-full py-0.5 px-2 bg-amber-100 text-amber-800 ml-2">
            {t("eventAwaiting")}
          </span>
        )}
        {cancelled && (
          <span className="flex-shrink-0 text-xs font-semibold rounded-full py-0.5 px-2 bg-red-100 text-red-800 ml-2">
            {t("eventCancelled")}
          </span>
        )}
        <span className="text-gray-400 text-xl ml-2">&rarr;</span>
      </Link>
    </li>
  );
};

EventRow.propTypes = {
  event: PropTypes.object.isRequired,
};

export default EventRow;
