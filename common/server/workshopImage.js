import { Workshops } from "/imports/common/collections/workshops";
import { Groups } from "/imports/common/collections/groups";
import { workshopImageStore } from "./workshopImageStore";

/**
 * WebApp.handlers callbacks that stream a workshop's or group's
 * representative image. Tokenless on purpose: the images are public content
 * (they will also feed the public website), and the file served is always
 * looked up from the entity document — never from the request — so the
 * endpoints cannot be used to read arbitrary files.
 *
 * URL shapes (the `v` query is ignored by the handler; callers append it so
 * a replaced image gets a new URL and browser caches never go stale):
 *   /api/workshops/<workshopId>/image[?v=<imageFileId>]
 *   /api/groups/<groupId>/image[?v=<imageFileId>]
 */
const makeImageHandler = (findDoc) => async (req, res) => {
  const [path] = req.url.split("?");
  const match = path.match(/^\/([^/]+)\/image\/?$/);
  if (!match) {
    res.writeHead(404);
    res.end();
    return;
  }
  if (req.method !== "GET") {
    res.writeHead(405);
    res.end("Only GET is supported");
    return;
  }

  const doc = await findDoc(decodeURIComponent(match[1]));
  if (!doc?.imageFileId) {
    res.writeHead(404);
    res.end();
    return;
  }

  const etag = `"${doc.imageFileId}"`;
  if (req.headers["if-none-match"] === etag) {
    res.writeHead(304, { ETag: etag, "Cache-Control": "public, max-age=86400" });
    res.end();
    return;
  }

  let buffer;
  try {
    buffer = await workshopImageStore.downloadImage(doc.imageFileId);
  } catch (err) {
    console.error(`[entityImage] download failed for ${doc.imageFileId}:`, err.message);
    res.writeHead(404);
    res.end();
    return;
  }

  res.writeHead(200, {
    "Content-Type": doc.imageMimeType || "application/octet-stream",
    "Content-Length": buffer.length,
    "Cache-Control": "public, max-age=86400",
    ETag: etag,
  });
  res.end(buffer);
};

export const makeWorkshopImageHandler = () =>
  makeImageHandler((id) => Workshops.findOneAsync(id));

export const makeGroupImageHandler = () =>
  makeImageHandler((id) => Groups.findOneAsync(id));

// Relative (same-origin) URL for an entity's image, or null when it has none.
const imageUrlFor = (basePath, doc) =>
  doc?.imageFileId
    ? `${basePath}/${encodeURIComponent(doc._id)}/image` +
      `?v=${encodeURIComponent(doc.imageFileId)}`
    : null;

export const workshopImageUrlFor = (workshop) => imageUrlFor("/api/workshops", workshop);
export const groupImageUrlFor = (group) => imageUrlFor("/api/groups", group);
