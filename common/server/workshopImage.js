import { Workshops } from "/imports/common/collections/workshops";
import { workshopImageStore } from "./workshopImageStore";

/**
 * A WebApp.handlers callback (mounted at /api/workshops) that streams a
 * workshop's representative image. Tokenless on purpose: workshop images are
 * public content (they will also feed the public website), and the file served
 * is always looked up from the workshop document — never from the request —
 * so the endpoint cannot be used to read arbitrary files.
 *
 * URL shape: /api/workshops/<workshopId>/image[?v=<imageFileId>]
 * `v` is ignored by the handler; callers append it so a replaced image gets a
 * new URL and browser caches never go stale (the same trick receipt URLs use).
 */
export const makeWorkshopImageHandler = () => async (req, res) => {
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

  const workshop = await Workshops.findOneAsync(decodeURIComponent(match[1]));
  if (!workshop?.imageFileId) {
    res.writeHead(404);
    res.end();
    return;
  }

  const etag = `"${workshop.imageFileId}"`;
  if (req.headers["if-none-match"] === etag) {
    res.writeHead(304, { ETag: etag, "Cache-Control": "public, max-age=86400" });
    res.end();
    return;
  }

  let buffer;
  try {
    buffer = await workshopImageStore.downloadImage(workshop.imageFileId);
  } catch (err) {
    console.error(`[workshopImage] download failed for ${workshop.imageFileId}:`, err.message);
    res.writeHead(404);
    res.end();
    return;
  }

  res.writeHead(200, {
    "Content-Type": workshop.imageMimeType || "application/octet-stream",
    "Content-Length": buffer.length,
    "Cache-Control": "public, max-age=86400",
    ETag: etag,
  });
  res.end(buffer);
};

// Relative (same-origin) URL for a workshop's image, or null when it has none.
export const workshopImageUrlFor = (workshop) =>
  workshop?.imageFileId
    ? `/api/workshops/${encodeURIComponent(workshop._id)}/image` +
      `?v=${encodeURIComponent(workshop.imageFileId)}`
    : null;
