import React from "react";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import DOMPurify from "dompurify";

// Configure DOMPurify to open links in new tab
DOMPurify.addHook("afterSanitizeAttributes", (node) => {
  if (node.tagName === "A") {
    node.setAttribute("target", "_blank");
    node.setAttribute("rel", "noopener noreferrer");
  }
});

const formatEventDate = (startDate, endDate, language) => {
  const locale = language === 'sv' ? 'sv-SE' : 'en-US';
  const start = new Date(startDate);
  const end = new Date(endDate);

  const dateOptions = { weekday: 'short', month: 'short', day: 'numeric' };
  const timeOptions = { hour: '2-digit', minute: '2-digit' };

  const startDateStr = start.toLocaleDateString(locale, dateOptions);
  const startTimeStr = start.toLocaleTimeString(locale, timeOptions);
  const endTimeStr = end.toLocaleTimeString(locale, timeOptions);

  return `${startDateStr} ${startTimeStr} - ${endTimeStr}`;
};

const Calendar = ({ events, loading, error, hasMore, loadingMore, onLoadMore }) => {
  const { t, i18n } = useTranslation();

  if (loading) {
    return (
      <div className="login-form">
        <div className="loader"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="login-form">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="login-form">
      <h3 className="text-h3">{t("Calender")}</h3>
      <div className="flex flex-col gap-4 mt-4">
        {events.length === 0 ? (
          <p className="text-center text-gray-600">{t("noUpcomingEvents")}</p>
        ) : (
          <>
            {events.map((event) => (
              <div key={event.id} className="border rounded p-3 bg-white">
                <h4 className="font-bold">{event.summary}</h4>
                <p className="text-sm text-gray-600">
                  {formatEventDate(event.start, event.end, i18n.language)}
                </p>
                {event.location && (
                  <p className="text-sm text-gray-500">{event.location}</p>
                )}
                {event.description && (
                  <div
                    className="text-sm mt-2 [&_a]:text-blue-600 [&_a]:underline [&_a]:hover:text-blue-800"
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
                className="w-full py-2 text-blue-600 hover:text-blue-800 disabled:text-gray-400 cursor-pointer disabled:cursor-default"
              >
                {loadingMore ? t("loading") : t("loadMoreEvents")}
              </button>
            )}
          </>
        )}
      </div>
    </div>
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
};

Calendar.defaultProps = {
  events: [],
  loading: false,
  error: "",
  hasMore: false,
  loadingMore: false,
  onLoadMore: () => {},
};

export default Calendar;
