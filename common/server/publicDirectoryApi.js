import { Workshops } from "/imports/common/collections/workshops";
import { Groups } from "/imports/common/collections/groups";
import { Spaces } from "/imports/common/collections/spaces";
import { adminBaseUrl } from "/imports/common/lib/links";
import { buildDirectory } from "/imports/common/lib/publicDirectory";
import { workshopImageUrlFor, groupImageUrlFor, spaceIconUrlFor } from "./workshopImage";

/**
 * WebApp.handlers callback serving the workshops-and-groups listing the public
 * website builds from. Mounted at /api/public (see the mounting app's
 * server/api/).
 *
 * URL shape:
 *   /api/public/entries
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

  const entries = buildDirectory({
    workshops,
    groups,
    iconUrlFor: (spaceId) => absolute(spaceIconUrlFor(spaceById.get(spaceId))),
    imageUrlFor: ({ doc, kind }) =>
      absolute(kind === "workshop" ? workshopImageUrlFor(doc) : groupImageUrlFor(doc)),
  });

  const payload = JSON.stringify({ entries });
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
