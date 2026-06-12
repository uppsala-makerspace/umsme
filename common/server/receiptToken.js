import { Meteor } from "meteor/meteor";
import crypto from "crypto";
import { Expenses } from "/imports/common/collections/expenses";
import { downloadImage } from "/imports/common/server/googleDrive";

/**
 * Signed capability URLs for receipt images.
 *
 * An <img> request carries no DDP session, so the receipt HTTP endpoint is
 * authorized by an unguessable token that is only ever minted by a method
 * AFTER the caller passed the normal authz check (owner in the app, role in
 * admin). The endpoint then trusts the token, like a signed S3 URL.
 *
 * The token is scoped to the exact photo version (driveFileId) so replacing
 * the photo changes the URL (no stale cache), and day-bucketed so the URL is
 * stable within a day (browser caching) while a leaked URL is valid <= ~48h.
 */

const DAY_MS = 86_400_000;

// Per-app secret. Falls back to a random per-process secret (fine for a single
// instance / dev); production should set settings.private.receiptTokenSecret,
// especially when load-balanced across processes.
let _secret = null;
const secret = () => {
  if (_secret) return _secret;
  const configured = Meteor.settings?.private?.receiptTokenSecret;
  if (configured) {
    _secret = String(configured);
  } else {
    _secret = crypto.randomBytes(32).toString("hex");
    console.warn(
      "[receiptToken] settings.private.receiptTokenSecret not set; using a " +
      "random per-process secret. Receipt URLs will not survive a restart and " +
      "will not validate across multiple server instances."
    );
  }
  return _secret;
};

const sign = (expenseId, driveFileId, bucket) =>
  crypto
    .createHmac("sha256", secret())
    .update(`${expenseId}:${driveFileId}:${bucket}`)
    .digest("base64url");

export const signReceiptToken = (expenseId, driveFileId) =>
  sign(expenseId, driveFileId, Math.floor(Date.now() / DAY_MS));

// Accept today's and yesterday's bucket (<= ~48h), using a constant-time compare.
export const verifyReceiptToken = (expenseId, driveFileId, token) => {
  if (!token) return false;
  const today = Math.floor(Date.now() / DAY_MS);
  for (const bucket of [today, today - 1]) {
    const expected = sign(expenseId, driveFileId, bucket);
    if (
      expected.length === token.length &&
      crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(token))
    ) {
      return true;
    }
  }
  return false;
};

// Relative (same-origin) URL the minting methods hand to the client.
export const receiptUrlFor = (expenseId, driveFileId) =>
  `/api/expenses/${encodeURIComponent(expenseId)}/receipt` +
  `?v=${encodeURIComponent(driveFileId)}&t=${signReceiptToken(expenseId, driveFileId)}`;

/**
 * A WebApp.handlers callback (mounted at /api/expenses) that streams a receipt
 * image for a valid token. Identical in both apps; authz happened at mint time.
 */
export const makeReceiptHandler = () => async (req, res) => {
  const [path, query = ""] = req.url.split("?");
  const match = path.match(/^\/([^/]+)\/receipt\/?$/);
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
  const expenseId = decodeURIComponent(match[1]);
  const params = new URLSearchParams(query);
  const driveFileId = params.get("v") || "";
  const token = params.get("t") || "";

  if (!verifyReceiptToken(expenseId, driveFileId, token)) {
    res.writeHead(403);
    res.end("Invalid token");
    return;
  }

  const expense = await Expenses.findOneAsync(expenseId);
  if (!expense) {
    res.writeHead(404);
    res.end();
    return;
  }

  const etag = `"${driveFileId}"`;
  if (req.headers["if-none-match"] === etag) {
    res.writeHead(304, { ETag: etag, "Cache-Control": "private, max-age=86400" });
    res.end();
    return;
  }

  let buffer;
  try {
    buffer = await downloadImage(driveFileId);
  } catch (err) {
    console.error(`[receiptToken] download failed for ${driveFileId}:`, err.message);
    res.writeHead(404);
    res.end();
    return;
  }

  res.writeHead(200, {
    "Content-Type": expense.mimeType || "application/octet-stream",
    "Content-Length": buffer.length,
    "Cache-Control": "private, max-age=86400",
    ETag: etag,
  });
  res.end(buffer);
};
