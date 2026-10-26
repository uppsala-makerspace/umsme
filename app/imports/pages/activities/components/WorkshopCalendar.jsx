import React, { useState } from "react";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import { ChevronDownIcon } from "@heroicons/react/20/solid";
import EventRow from "./EventRow";
import { ActivityList } from "./ActivityLinks";

/**
 * A workshop's or area of interest's calendar: its events to come, and
 * below them its activities, folded away until asked for. Nothing when it
 * has neither.
 */
const WorkshopCalendar = ({ events, activities }) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  if (!events?.length && !activities?.length) return null;
  return (
    <section className="mb-6">
      <h3 className="text-lg mb-2 text-gray-700 border-b border-gray-200 pb-2">{t("navCalendar")}</h3>
      {events?.length ? (
        <ul className="list-none p-0 m-0">
          {events.map((event) => <EventRow key={event._id} event={event} />)}
        </ul>
      ) : (
        <p className="text-gray-500 m-0 mb-2">{t("activitiesNoUpcoming")}</p>
      )}
      {activities?.length > 0 && (
        <>
          <button type="button" aria-expanded={open} onClick={() => setOpen((o) => !o)}
            className="w-full flex items-center justify-between py-2 px-0 bg-transparent border-none text-left text-[#5fc86f] hover:text-[#096817] cursor-pointer">
            <span>{t(open ? "workshopHideActivities" : "workshopShowActivities", { count: activities.length })}</span>
            {/* Down when folded, up when open. */}
            <ChevronDownIcon className={`w-5 h-5 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
          </button>
          {open && <ActivityList activities={activities} marked />}
        </>
      )}
    </section>
  );
};

WorkshopCalendar.propTypes = {
  events: PropTypes.array,
  activities: PropTypes.array,
};

export default WorkshopCalendar;
