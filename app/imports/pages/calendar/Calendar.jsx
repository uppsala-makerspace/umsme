import React from "react";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import DOMPurify from "dompurify";
import MainContent from "../../components/MainContent";
import Loader from "../../components/Loader";
import Tabs from "../../components/Tabs";

// Configure DOMPurify to open links in new tab
DOMPurify.addHook("afterSanitizeAttributes", (node) => {
  if (node.tagName === "A") {
    node.setAttribute("target", "_blank");
    node.setAttribute("rel", "noopener noreferrer");
  }
});

const formatEventDate = (startDate, endDate, language, mode) => {
  const locale = language === 'sv' ? 'sv-SE' : 'en-US';
  const start = new Date(startDate);
  const end = new Date(endDate);

  const dateOptions = { weekday: 'short', month: 'short', day: 'numeric' };
  if (mode === 'past') {
    dateOptions.year = 'numeric';
  }
  const timeOptions = { hour: '2-digit', minute: '2-digit' };

  const startDateStr = start.toLocaleDateString(locale, dateOptions);
  const startTimeStr = start.toLocaleTimeString(locale, timeOptions);
  const endTimeStr = end.toLocaleTimeString(locale, timeOptions);

  return `${startDateStr} ${startTimeStr} - ${endTimeStr}`;
};

// Format Date as YYYYMMDDTHHMMSSZ (UTC) for iCalendar
const toIcsDate = (date) => {
  const d = new Date(date);
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
};

const icsEscape = (text) =>
  String(text || "")
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");

const buildIcsDataUrl = (event) => {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Uppsala MakerSpace//Calendar//EN",
    "BEGIN:VEVENT",
    `UID:${event.id}@uppsalamakerspace.se`,
    `DTSTAMP:${toIcsDate(new Date())}`,
    `DTSTART:${toIcsDate(event.start)}`,
    `DTEND:${toIcsDate(event.end)}`,
    `SUMMARY:${icsEscape(event.summary)}`,
  ];
  if (event.location) lines.push(`LOCATION:${icsEscape(event.location)}`);
  if (event.description) {
    const plain = event.description.replace(/<[^>]+>/g, "");
    lines.push(`DESCRIPTION:${icsEscape(plain)}`);
  }
  lines.push("END:VEVENT");
  lines.push("END:VCALENDAR");
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(lines.join("\r\n"))}`;
};

const CalendarPlusIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
    <line x1="12" y1="14" x2="12" y2="18" />
    <line x1="10" y1="16" x2="14" y2="16" />
  </svg>
);

const Calendar = ({ events, loading, error, hasMore, loadingMore, onLoadMore, mode, onModeChange }) => {
  const { t, i18n } = useTranslation();

  return (
    <MainContent topPadding={false}>
      <Tabs
        tabs={[
          { key: "upcoming", label: t("upcomingEvents") },
          { key: "past", label: t("pastEvents") },
        ]}
        activeTab={mode}
        onTabChange={onModeChange}
      />
      {loading ? (
        <Loader />
      ) : error ? (
        <p className="text-red-600">{error}</p>
      ) : (
      <div className="flex flex-col gap-4">
        {events.length === 0 ? (
          <p className="text-center text-gray-600">
            {mode === "past" ? t("noPastEvents") : t("noUpcomingEvents")}
          </p>
        ) : (
          <>
            {events.map((event) => (
              <div key={event.id} className="border rounded p-3 bg-white">
                <h4 className="font-bold">{event.summary}</h4>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm text-gray-600 m-0">
                    {formatEventDate(event.start, event.end, i18n.language, mode)}
                  </p>
                  {mode === "upcoming" && (
                    <a
                      href={buildIcsDataUrl(event)}
                      download={`${event.summary || "event"}.ics`}
                      aria-label={t("addToCalendar")}
                      title={t("addToCalendar")}
                      className="text-gray-500 hover:text-brand-green shrink-0"
                    >
                      <CalendarPlusIcon />
                    </a>
                  )}
                </div>
                {event.location && (
                  <p className="text-sm text-gray-500">{event.location}</p>
                )}
                {event.description && (
                  <div
                    className="text-sm mt-2 break-all [&_a]:text-blue-600 [&_a]:underline [&_a]:hover:text-blue-800"
                    dangerouslySetInnerHTML={{
                      __html: DOMPurify.sanitize(event.description),
                    }}
                  />
                )}
              </div>
            ))}
            {hasMore && (
              <button
                onClick={onLoadMore}
                disabled={loadingMore}
                className="w-full py-2 text-[#5fc86f] hover:text-[#096817] disabled:text-gray-400 cursor-pointer disabled:cursor-default"
              >
                {loadingMore ? t("loading") : (mode === "past" ? t("loadOlderEvents") : t("loadMoreEvents"))}
              </button>
            )}
          </>
        )}
      </div>
      )}
    </MainContent>
  );
};

Calendar.propTypes = {
  /** Array of calendar events */
  events: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string.isRequired,
    summary: PropTypes.string.isRequired,
    start: PropTypes.string.isRequired,
    end: PropTypes.string.isRequired,
    location: PropTypes.string,
    description: PropTypes.string,
  })),
  /** Whether events are being loaded */
  loading: PropTypes.bool,
  /** Error message if fetch failed */
  error: PropTypes.string,
  /** Whether more events are available to load */
  hasMore: PropTypes.bool,
  /** Whether more events are currently being loaded */
  loadingMore: PropTypes.bool,
  /** Callback to load more events */
  onLoadMore: PropTypes.func,
  /** Current view mode: upcoming or past events */
  mode: PropTypes.oneOf(["upcoming", "past"]),
  /** Callback when mode changes */
  onModeChange: PropTypes.func,
};

Calendar.defaultProps = {
  events: [],
  loading: false,
  error: "",
  hasMore: false,
  loadingMore: false,
  onLoadMore: () => {},
  mode: "upcoming",
  onModeChange: () => {},
};

export default Calendar;
