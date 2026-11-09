import { Workshops } from "/imports/common/collections/workshops";
import { Groups } from "/imports/common/collections/groups";
import { Spaces } from "/imports/common/collections/spaces";
import { Activities } from "/imports/common/collections/activities";
import { Events } from "/imports/common/collections/events";
import { Members } from "/imports/common/collections/members";
import { ActivityCategories } from "/imports/common/collections/activityCategories";
import { adminBaseUrl } from "/imports/common/lib/links";
import { buildDirectory } from "/imports/common/lib/publicDirectory";
import { resolveEvent } from "/imports/common/lib/activityRules";
import {
  workshopImageUrlFor,
  groupImageUrlFor,
  spaceIconUrlFor,
  activityImageUrlFor,
  eventImageUrlFor,
} from "./workshopImage";

/**
 * WebApp.handlers callback serving what the public website builds from: the
 * workshops, areas of interest and open groups, the map's spaces, and the link between them;
 * the published activities and events to come, and the categories of activities.
 * Mounted at /api/public (see the mounting app's server/api/).
 *
 * URL shape:
 *   /api/public/entries   -> { entries, spaces, palette, events, categories }
 *
 * The floor plan SVGs are NOT part of this: they are static assets of the member
 * app (/images/floor1.svg, /images/floor2.svg), reachable without login, and the
 * website hardcodes that base.
 *
 * DELIBERATELY WORLD-READABLE — do not put this behind the nginx allow/deny
 * block that guards /api/certificates. It exists to be fetched by an external
 * website, hourly, and the images it points at are already public.
 *
 * It takes no parameters at all: no id, no search, no paging. The response is a
 * function of the database and nothing from the request is read back out, which
 * is what keeps an open endpoint on the admin host uninteresting to poke at.
 */
const sendJson = (res, status, body, headers = {}) => {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", ...headers });
  res.end(body);
};

// Cheap, stable ETag over the payload: same content, same tag, so an hourly
// caller that already has it gets a 304 and no body.
const etagFor = (payload) => {
  let hash = 5381;
  for (let i = 0; i < payload.length; i += 1) {
    hash = ((hash * 33) ^ payload.charCodeAt(i)) >>> 0;
  }
  return `"${hash.toString(36)}-${payload.length.toString(36)}"`;
};

const absolute = (path) => {
  if (!path) return null;
  const base = adminBaseUrl();
  return base ? `${base}${path}` : path;
};

// Workshops and areas of interest share the workshop route.
const IMAGE_URLS = { group: groupImageUrlFor, activity: activityImageUrlFor, event: eventImageUrlFor };

export const makePublicDirectoryHandler = () => async (req, res) => {
  const [path] = req.url.split("?");
  if (!/^\/entries\/?$/.test(path)) {
    res.writeHead(404);
    res.end();
    return;
  }
  if (req.method !== "GET") {
    res.writeHead(405);
    res.end("Only GET is supported");
    return;
  }

  const workshops = await Workshops.find({}).fetchAsync();
  const groups = await Groups.find({}).fetchAsync();
  const spaces = await Spaces.find({}).fetchAsync();
  const spaceById = new Map(spaces.map((s) => [s._id, s]));
  const now = new Date();
  const activities = await Activities.find({ published: true }).fetchAsync();
  // Events of activities take `published` from them, so all to come are read.
  const events = await Events.find({ end: { $gte: now } }).fetchAsync();
  const categories = await ActivityCategories.find({}).fetchAsync();
  // The names of the hosts of events that show them, and nothing else about
  // any member; buildDirectory publishes only the first name.
  const activityById = new Map(activities.map((a) => [a._id, a]));
  const hostIds = [...new Set(events
    .map((e) => resolveEvent(e, activityById.get(e.activityId)))
    .filter((e) => e.published && e.hostsPublished)
    .flatMap((e) => e.hostMemberIds || []))];
  const memberNames = Object.fromEntries((hostIds.length
    ? await Members.find({ _id: { $in: hostIds } }, { fields: { name: 1 } }).fetchAsync()
    : []).map((m) => [m._id, m.name]));

  const directory = buildDirectory({
    workshops,
    groups,
    spaces,
    iconUrlFor: (spaceDocId) => absolute(spaceIconUrlFor(spaceById.get(spaceDocId))),
    imageUrlFor: ({ doc, kind }) => absolute((IMAGE_URLS[kind] || workshopImageUrlFor)(doc)),
    activities,
    events,
    categories,
    memberNames,
    now,
  });

  const payload = JSON.stringify(directory);
  const etag = etagFor(payload);
  // Matches the website's hourly poll; the image URLs carry ?v=<fileId> and so
  // invalidate themselves when an image is replaced.
  const cacheHeaders = { "Cache-Control": "public, max-age=3600", ETag: etag };

  if (req.headers["if-none-match"] === etag) {
    res.writeHead(304, cacheHeaders);
    res.end();
    return;
  }

  sendJson(res, 200, payload, cacheHeaders);
};
