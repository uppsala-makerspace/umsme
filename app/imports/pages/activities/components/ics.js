import { localized } from "/imports/common/lib/groupRules";

/**
 * An event as an iCalendar file, to add to one's own calendar: a data URL
 * for a download link. Times in UTC, so the calendar shows them in its own
 * time zone.
 */

// YYYYMMDDTHHMMSSZ
const icsDate = (date) => new Date(date).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

const escape = (text) => String(text || "")
  .replace(/\\/g, "\\\\")
  .replace(/\r?\n/g, "\\n")
  .replace(/,/g, "\\,")
  .replace(/;/g, "\\;");

/** The lines of the file, for an event as the app shows it, and a link back to its page. */
const icsLines = (event, lang, { url, now = new Date() } = {}) => {
  const description = localized(event.description, lang);
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Uppsala MakerSpace//Activities//EN",
    "BEGIN:VEVENT",
    `UID:${event._id}@uppsalamakerspace.se`,
    `DTSTAMP:${icsDate(now)}`,
    `DTSTART:${icsDate(event.start)}`,
    `DTEND:${icsDate(event.end || event.start)}`,
    `SUMMARY:${escape(localized(event.name, lang))}`,
    ...(event.spaceName ? [`LOCATION:${escape(localized(event.spaceName, lang))}`] : []),
    ...(description || url ? [`DESCRIPTION:${escape([description, url].filter(Boolean).join("\n\n"))}`] : []),
    ...(url ? [`URL:${url}`] : []),
    ...(event.status === "cancelled" ? ["STATUS:CANCELLED"] : []),
    "END:VEVENT",
    "END:VCALENDAR",
  ];
};

export const icsDataUrl = (event, lang, options) =>
  `data:text/calendar;charset=utf-8,${encodeURIComponent(icsLines(event, lang, options).join("\r\n"))}`;
