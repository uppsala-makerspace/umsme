// How an event's time reads: "tis 5 nov 18:00–20:00", in the reader's language.
const locale = (lang) => (lang === "en" ? "en-GB" : "sv-SE");

// The year only when it is not this one.
export const eventDay = (date, lang) => {
  const d = new Date(date);
  return d.toLocaleDateString(locale(lang), {
    weekday: "short", day: "numeric", month: "short",
    ...(d.getFullYear() !== new Date().getFullYear() ? { year: "numeric" } : {}),
  });
};

const clock = (date, lang) =>
  new Date(date).toLocaleTimeString(locale(lang), { hour: "2-digit", minute: "2-digit" });

/** The day and times; the end's day too when it is another. */
export const eventWhen = (event, lang) => {
  const start = new Date(event.start);
  const end = new Date(event.end);
  const sameDay = start.toDateString() === end.toDateString();
  return `${eventDay(start, lang)} ${clock(start, lang)}–${sameDay ? "" : `${eventDay(end, lang)} `}${clock(end, lang)}`;
};
