import { Workshops } from "/imports/common/collections/workshops";
import { Groups } from "/imports/common/collections/groups";
import { Spaces } from "/imports/common/collections/spaces";
import { workshopImageStore } from "./workshopImageStore";
import { mapIconStore } from "./mapIconStore";

/**
 * WebApp.handlers callbacks that stream entity images: workshop/group
 * representative images and space map icons. Tokenless on purpose: the
 * images are public content (they will also feed the public website), and
 * the file served is always looked up from the entity document — never from
 * the request — so the endpoints cannot be used to read arbitrary files.
 *
 * URL shapes (the `v` query is ignored by the handler; callers append it so
 * a replaced image gets a new URL and browser caches never go stale):
 *   /api/workshops/<workshopId>/image[?v=<fileId>]
 *   /api/groups/<groupId>/image[?v=<fileId>]
 *   /api/spaces/<spaceId>/icon[?v=<fileId>]
 */
const makeImageHandler = (segment, resolve) => async (req, res) => {
  const [path] = req.url.split("?");
  const match = path.match(new RegExp(`^\\/([^/]+)\\/${segment}\\/?$`));
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

  const image = await resolve(decodeURIComponent(match[1]));
  if (!image?.fileId) {
    res.writeHead(404);
    res.end();
    return;
  }

  const etag = `"${image.fileId}"`;
  if (req.headers["if-none-match"] === etag) {
    res.writeHead(304, { ETag: etag, "Cache-Control": "public, max-age=86400" });
    res.end();
    return;
  }

  let buffer;
  try {
    buffer = await image.store.downloadImage(image.fileId);
  } catch (err) {
    console.error(`[entityImage] download failed for ${image.fileId}:`, err.message);
    res.writeHead(404);
    res.end();
    return;
  }

  res.writeHead(200, {
    "Content-Type": image.mimeType || "application/octet-stream",
    "Content-Length": buffer.length,
    "Cache-Control": "public, max-age=86400",
    ETag: etag,
  });
  res.end(buffer);
};

export const makeWorkshopImageHandler = () =>
  makeImageHandler("image", async (id) => {
    const doc = await Workshops.findOneAsync(id);
    return { fileId: doc?.imageFileId, mimeType: doc?.imageMimeType, store: workshopImageStore };
  });

export const makeGroupImageHandler = () =>
  makeImageHandler("image", async (id) => {
    const doc = await Groups.findOneAsync(id);
    return { fileId: doc?.imageFileId, mimeType: doc?.imageMimeType, store: workshopImageStore };
  });

export const makeSpaceIconHandler = () =>
  makeImageHandler("icon", async (id) => {
    const doc = await Spaces.findOneAsync(id);
    return { fileId: doc?.iconFileId, mimeType: doc?.iconMimeType, store: mapIconStore };
  });

// Relative (same-origin) URLs, or null when the entity has no image/icon.
const urlFor = (basePath, segment, id, fileId) =>
  fileId
    ? `${basePath}/${encodeURIComponent(id)}/${segment}?v=${encodeURIComponent(fileId)}`
    : null;

export const workshopImageUrlFor = (workshop) =>
  urlFor("/api/workshops", "image", workshop?._id, workshop?.imageFileId);
export const groupImageUrlFor = (group) =>
  urlFor("/api/groups", "image", group?._id, group?.imageFileId);
export const spaceIconUrlFor = (space) =>
  urlFor("/api/spaces", "icon", space?._id, space?.iconFileId);
