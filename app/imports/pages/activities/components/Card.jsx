import React from "react";

// The heading bands: light blue for an activity, light green for an event,
// in forms and read views alike, so the two, alike as they are, are told
// apart at a glance.
const BANDS = {
  activity: "bg-sky-50 border-sky-100 text-sky-800",
  event: "bg-green-50 border-green-100 text-green-800",
};

/**
 * A part of a page or a form, as a card with its heading in a coloured band,
 * so a long page reads in parts and the heading stands apart from bold
 * labels. `kind` is what it is about, "activity" or "event"; `actions` sit
 * at the band's right. In a form the fields keep their own space below
 * (`form`); elsewhere the card pads all round.
 */
const Card = ({ title, kind = "event", actions, form = false, children }) => (
  <section className="mb-4 rounded-lg bg-white border border-gray-200 overflow-hidden">
    <div className={`flex items-center gap-2 px-4 py-2 border-b ${BANDS[kind]}`}>
      <h3 className="m-0 text-sm font-semibold uppercase tracking-wider">{title}</h3>
      {actions && <div className="ml-auto flex items-center gap-2 whitespace-nowrap">{actions}</div>}
    </div>
    <div className={form ? "p-4 pb-0" : "p-4"}>{children}</div>
  </section>
);

export default Card;
