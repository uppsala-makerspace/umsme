/**
 * Shapes the workshops-and-groups listing published for the public website.
 *
 * Pure: takes documents already read from the database plus URL builders, so
 * the selection rules and the JSON shape can be unit tested without Meteor.
 * The HTTP side lives in common/server/publicDirectoryApi.js.
 */
import { withUniqueSlugs } from "./slug";

/**
 * Only workshops that exist for members to use. A forming workshop is not
 * there yet and a decommissioned one is gone; neither belongs on a public page.
 */
export const PUBLIC_WORKSHOP_STATUSES = ["established", "trial"];

/**
 * Only the groups anyone can join. Steering and responsibility groups are the
 * internal machinery around a workshop and say nothing to an outsider.
 */
export const PUBLIC_GROUP_TYPES = ["interest", "function"];

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
 * Build the export array.
 *
 * @param {object} args
 * @param {Array<object>} args.workshops  all workshops; filtered here
 * @param {Array<object>} args.groups     all groups; filtered here
 * @param {(spaceId: string) => string|null} args.iconUrlFor  primary space icon
 * @param {(entry: object) => string|null} args.imageUrlFor   entity image
 * @return {Array<object>}
 */
export const buildDirectory = ({ workshops = [], groups = [], iconUrlFor, imageUrlFor }) => {
  const entries = [
    ...workshops
      .filter((w) => PUBLIC_WORKSHOP_STATUSES.includes(w.status))
      .map((w) => ({ doc: w, kind: "workshop" })),
    ...groups
      .filter((g) => PUBLIC_GROUP_TYPES.includes(g.type))
      .map((g) => ({ doc: g, kind: "group" })),
  ];

  // Workshops and groups share one list, so the slugs must be unique across
  // both — hence one pass over the combined set rather than one per kind.
  const slugById = new Map(
    withUniqueSlugs(entries.map(({ doc }) => ({ _id: doc._id, source: doc.name?.sv })))
      .map(({ _id, slug }) => [_id, slug])
  );

  return entries.map(({ doc, kind }) =>
    withoutEmpty({
      id: slugById.get(doc._id),
      kind,
      // A workshop's status and a group's type are different kinds of fact, so
      // they get different keys rather than one field meaning two things.
      ...(kind === "workshop" ? { status: doc.status } : { type: doc.type }),
      icon: doc.primarySpaceId ? iconUrlFor(doc.primarySpaceId) : null,
      name: bilingual(doc.name),
      tag: bilingual(doc.tag),
      image: imageUrlFor({ doc, kind }),
      // Raw markdown: the website renders it. Truncating here (as the app's
      // markdownExcerpt does for cards) would be wrong for a full page.
      text: bilingual(doc.description),
    })
  );
};
