/**
 * Shapes the listing published for the public website: the workshops, areas
 * of interest and open groups, the map's spaces, and the link between them;
 * the published activities with their events to come, the published
 * free-standing events, and the categories of activities.
 *
 * Pure: takes documents already read from the database plus URL builders, so
 * the selection rules and the JSON shape can be unit tested without Meteor.
 * The HTTP side lives in common/server/publicDirectoryApi.js.
 */
import { withUniqueSlugs } from "./slug";
import { SPACE_COLORS, spaceColorName } from "./spaceColors";
import { resolveEvent, REGISTRATIONS, seatsLeft } from "./activityRules";

/**
 * Only workshops and areas of interest that exist for members to use. A forming
 * one is not there yet and a decommissioned one is gone; neither belongs on a
 * public page.
 */
export const PUBLIC_WORKSHOP_STATUSES = ["established", "trial"];

/**
 * Only the groups anyone can join. Steering and responsibility groups are the
 * internal machinery around a workshop or area of interest and say nothing to an
 * outsider.
 */
export const PUBLIC_GROUP_TYPES = ["function"];

// How many of an activity's past events are published: the latest.
export const PAST_EVENTS = 10;

// Areas of interest share the workshops collection; a document without a kind
// predates them and is a workshop.
const workshopKind = (w) => (w.kind === "areaOfInterest" ? "areaOfInterest" : "workshop");

// Skip keys with no value rather than publishing nulls: the consumer can then
// test for presence instead of for presence-and-non-null.
const withoutEmpty = (obj) =>
  Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== null && v !== undefined));

// Bilingual field, dropped entirely when neither language is filled in.
const bilingual = (field) => {
  const sv = field?.sv || null;
  const en = field?.en || null;
  if (!sv && !en) return null;
  return withoutEmpty({ sv, en });
};

/**
 * An entity's spaces, primary first, in the same order and with the same colors
 * the app's mini map uses — see spacesMapView in app/server/methods/utils.js
 * and SpaceMapSection, which colors by index over the *resolved* list.
 *
 * An entity with no primary space gets nothing, matching the app: spacesMapView
 * returns null there, and calling the first secondary "primary" would be a lie.
 *
 * The linking fields store space document ids, not the map's spaceId.
 */
const spaceLinksFor = (doc, spaceById) => {
  const primary = spaceById.get(doc.primarySpaceId);
  if (!primary) return [];
  const resolved = [
    primary,
    ...(doc.secondarySpaceIds || []).map((id) => spaceById.get(id)).filter(Boolean),
  ];
  return resolved.map((space, index) => ({
    // spaceId alone is ambiguous — "kitchen" exists on both floors — so the
    // pair (spaceId, floor) is the key, never spaceId on its own.
    spaceId: space.spaceId,
    floor: space.floor,
    role: index === 0 ? "primary" : "secondary",
    color: spaceColorName(index),
  }));
};

/**
 * Build the export.
 *
 * @param {object} args
 * @param {Array<object>} args.workshops  all workshops and areas of interest; filtered here
 * @param {Array<object>} args.groups     all groups; filtered here
 * @param {Array<object>} args.spaces     all spaces; all are published
 * @param {(spaceDocId: string) => string|null} args.iconUrlFor
 * @param {(entry: {doc: object, kind: string}) => string|null} args.imageUrlFor
 *   kind is also "activity", and "event" for an event resolved against its activity
 * @param {Array<object>} args.activities  all activities; the published ones are entries
 * @param {Array<object>} args.events      all events; those to come are published, and
 *   an activity's latest past ones (PAST_EVENTS of them)
 * @param {Array<object>} args.categories  all categories of activities
 * @param {Object<string, string>} args.memberNames  member id → name, for the
 *   hosts of events that show them; only the first name is published
 * @param {Date} args.now                  what "to come" is counted from
 * @return {{entries: Array<object>, spaces: Array<object>, palette: object,
 *           events: Array<object>, categories: Array<object>}}
 */
export const buildDirectory = ({
  workshops = [],
  groups = [],
  spaces = [],
  iconUrlFor,
  imageUrlFor,
  activities = [],
  events = [],
  categories = [],
  memberNames = {},
  now = new Date(),
}) => {
  const published = [
    ...workshops
      .filter((w) => PUBLIC_WORKSHOP_STATUSES.includes(w.status))
      .map((w) => ({ doc: w, kind: workshopKind(w) })),
    ...groups
      .filter((g) => PUBLIC_GROUP_TYPES.includes(g.type))
      .map((g) => ({ doc: g, kind: "group" })),
    ...activities
      .filter((a) => a.published)
      .map((a) => ({ doc: a, kind: "activity" })),
  ];

  // Workshops, areas of interest, groups and activities share one list, so the slugs must be
  // unique across all of them — hence one pass over the combined set rather
  // than one per kind.
  const slugById = new Map(
    withUniqueSlugs(published.map(({ doc }) => ({ _id: doc._id, source: doc.name?.sv })))
      .map(({ _id, slug }) => [_id, slug])
  );
  const spaceById = new Map(spaces.map((s) => [s._id, s]));

  const categorySlugs = new Map(
    withUniqueSlugs(categories.map((c) => ({ _id: c._id, source: c.name?.sv })))
      .map(({ _id, slug }) => [_id, slug])
  );
  // An event, or an activity, refers to a workshop or group by its entry id,
  // and only to one that is published.
  const entryId = (docId) => (docId ? slugById.get(docId) || null : null);
  const spaceOf = (spaceDocId) => {
    const space = spaceById.get(spaceDocId);
    return space ? { spaceId: space.spaceId, floor: space.floor } : null;
  };
  const toCome = events
    .filter((e) => e.end >= now)
    .sort((a, b) => a.start - b.start);
  const activityById = new Map(activities.map((a) => [a._id, a]));
  const eventTimes = (event) => ({
    start: event.start.toISOString(),
    end: event.end.toISOString(),
    status: event.status,
  });

  // Whether one signs up: required, optional or not at all (unset is none).
  const registrationOf = (doc) => (REGISTRATIONS.includes(doc.registration) ? doc.registration : "none");
  // The seats of one that takes sign-ups and has a limit: how many, and for an
  // event how many are left. Without a limit there is nothing to count.
  const seatsOf = (doc, { left = false } = {}) => (registrationOf(doc) !== "none" && doc.maxSeats
    ? { seats: doc.maxSeats, ...(left ? { seatsLeft: seatsLeft(doc, doc.seatsTaken || 0) } : {}) }
    : {});
  // The hosts of a (resolved) event, by first name only, when the event or its
  // activity says so. Nothing else about them; a host no longer a member is left out.
  const firstName = (name) => String(name || "").trim().split(/\s+/)[0] || null;
  const hostsOf = (event) => {
    if (!event.hostsPublished) return null;
    const names = (event.hostMemberIds || []).map((id) => firstName(memberNames[id])).filter(Boolean);
    return names.length > 0 ? names : null;
  };

  // An activity's past events, latest first.
  const past = events
    .filter((e) => e.end < now)
    .sort((a, b) => b.start - a.start);

  // An activity's events, to come or past: when, and where or what differs
  // from the activity.
  const eventsOf = (activity, list = toCome) => list
    .filter((e) => e.activityId === activity._id)
    .map((e) => resolveEvent(e, activity))
    .filter((e) => e.published)
    .map((e) => withoutEmpty({
      ...eventTimes(e),
      name: e.name !== activity.name ? bilingual(e.name) : null,
      space: spaceOf(e.spaceId),
      registration: registrationOf(e),
      ...seatsOf(e, { left: true }),
      hosts: hostsOf(e),
    }));

  const activityEntry = (doc, id) => {
    const upcoming = eventsOf(doc);
    const before = eventsOf(doc, past).slice(0, PAST_EVENTS);
    return withoutEmpty({
      id,
      kind: "activity",
      name: bilingual(doc.name),
      image: imageUrlFor({ doc, kind: "activity" }),
      text: bilingual(doc.description),
      category: categorySlugs.get(doc.categoryId) || null,
      workshop: entryId(doc.workshopId),
      group: entryId(doc.groupId),
      space: spaceOf(doc.spaceId),
      durationMinutes: doc.durationMinutes ?? null,
      cost: doc.cost ?? null,
      membersOnly: !!doc.membersOnly,
      registration: registrationOf(doc),
      ...seatsOf(doc),
      events: upcoming.length > 0 ? upcoming : null,
      pastEvents: before.length > 0 ? before : null,
    });
  };

  const entries = published.map(({ doc, kind }) => {
    if (kind === "activity") return activityEntry(doc, slugById.get(doc._id));
    const links = spaceLinksFor(doc, spaceById);
    return withoutEmpty({
      id: slugById.get(doc._id),
      kind,
      // The status of a workshop or area of interest and a group's type are
      // different kinds of fact, so they get different keys rather than one
      // field meaning two things.
      ...(kind === "group" ? { type: doc.type } : { status: doc.status }),
      icon: doc.primarySpaceId ? iconUrlFor(doc.primarySpaceId) : null,
      name: bilingual(doc.name),
      tag: bilingual(doc.tag),
      image: imageUrlFor({ doc, kind }),
      // Raw markdown: the website renders it. Truncating here (as the app's
      // markdownExcerpt does for cards) would be wrong for a full page.
      text: bilingual(doc.description),
      spaces: links.length > 0 ? links : null,
    });
  });

  // The reverse of the same relation, built from the same computation so the
  // two directions cannot disagree. Only published entries are referenced —
  // a space belonging to a forming workshop gets no link rather than an id
  // that is nowhere to be found in `entries`.
  const occupants = new Map();
  for (const { doc, kind } of published) {
    if (kind === "activity") continue;
    const id = slugById.get(doc._id);
    for (const spaceDocId of [doc.primarySpaceId, ...(doc.secondarySpaceIds || [])]) {
      if (!spaceById.has(spaceDocId)) continue;
      const bucket = occupants.get(spaceDocId) || { workshops: [], areasOfInterest: [], groups: [] };
      bucket[{ workshop: "workshops", areaOfInterest: "areasOfInterest", group: "groups" }[kind]].push(id);
      occupants.set(spaceDocId, bucket);
    }
  }

  // Every space is published, linked or not: an unoccupied room is still a room
  // on the floor plan and has to be drawable.
  const exportedSpaces = spaces.map((space) => {
    const bucket = occupants.get(space._id) || { workshops: [], areasOfInterest: [], groups: [] };
    return withoutEmpty({
      spaceId: space.spaceId,
      floor: space.floor,
      name: bilingual(space.name),
      text: bilingual(space.description),
      icon: iconUrlFor(space._id),
      iconSize: space.iconSize ?? null,
      // A space corresponds to at most one workshop (the app's rule, see
      // data.rooms), so this is singular while areas of interest and groups are
      // lists — an area of interest spans rooms that belong to workshops.
      workshop: bucket.workshops[0] || null,
      areasOfInterest: bucket.areasOfInterest.length > 0 ? bucket.areasOfInterest : null,
      groups: bucket.groups.length > 0 ? bucket.groups : null,
    });
  });

  // Free-standing events stand on their own: what an activity would say, they
  // say themselves. Their ids are made from the name and the day.
  const free = toCome.filter((e) => !e.activityId && e.published);
  const freeSlugs = new Map(
    withUniqueSlugs(free.map((e) => ({ _id: e._id, source: `${e.name?.sv || ""} ${e.start.toISOString().slice(0, 10)}` })))
      .map(({ _id, slug }) => [_id, slug])
  );
  const freeEvents = free.map((e) => withoutEmpty({
    id: freeSlugs.get(e._id),
    ...eventTimes(e),
    name: bilingual(e.name),
    image: imageUrlFor({ doc: resolveEvent(e, activityById.get(e.activityId)), kind: "event" }),
    text: bilingual(e.description),
    category: categorySlugs.get(e.categoryId) || null,
    workshop: entryId(e.workshopId),
    group: entryId(e.groupId),
    space: spaceOf(e.spaceId),
    cost: e.cost ?? null,
    membersOnly: !!e.membersOnly,
    registration: registrationOf(e),
    ...seatsOf(e, { left: true }),
    hosts: hostsOf(e),
  }));

  const exportedCategories = [...categories]
    .sort((a, b) => (a.sortOrder ?? Infinity) - (b.sortOrder ?? Infinity))
    .map((c) => withoutEmpty({ id: categorySlugs.get(c._id), name: bilingual(c.name) }));

  // Shipped so the website does not hardcode hex values that could drift from
  // the app's.
  return {
    entries,
    spaces: exportedSpaces,
    palette: SPACE_COLORS,
    events: freeEvents,
    categories: exportedCategories,
  };
};
