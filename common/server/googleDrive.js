import { Meteor } from "meteor/meteor";
import fs from "fs";
import path from "path";
import axios from "axios";

/**
 * Receipt image storage. Treats a Google shared drive as object storage,
 * bucketed into one folder per year under a configurable root folder.
 *
 * Configured via `Meteor.settings.private.googleDrive`:
 *   {
 *     "backend": "drive" | "local",
 *     // backend "drive":
 *     "credentials": { "client_email": "...", "private_key": "..." },  // or:
 *     "keyFile": "config/expense-service-account.json",               // path (relative to PWD)
 *     "sharedDriveId": "0A...",
 *     "rootFolder": "Receipts",
 *     // backend "local" (dev/testing without Google):
 *     "localPath": "/tmp/umsme-receipts"
 *   }
 *
 * Public API (both backends): uploadImage / downloadImage / deleteImage.
 * `fileId` is an opaque handle stored on the expense; its meaning differs per
 * backend (a Drive file id, or a path relative to localPath) but callers do
 * not need to care.
 */

const appRoot = process.env.PWD;

const config = () => Meteor.settings?.private?.googleDrive || {};

const extFor = (mimeType) => {
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  if (mimeType === "image/heic") return "heic";
  return "jpg";
};

// ---------------------------------------------------------------------------
// Google Drive backend (service-account JWT via google-auth-library + axios)
// ---------------------------------------------------------------------------

let _client = null;
const driveClient = () => {
  if (_client) return _client;
  // Imported lazily so the local backend works without the dependency present.
  const { JWT } = require("google-auth-library");
  const c = config();
  let creds = c.credentials;
  if (!creds && c.keyFile) {
    creds = JSON.parse(fs.readFileSync(path.resolve(appRoot, c.keyFile), "utf8"));
  }
  if (!creds?.client_email || !creds?.private_key) {
    throw new Meteor.Error("drive-config", "googleDrive credentials are not configured");
  }
  _client = new JWT({
    email: creds.client_email,
    key: creds.private_key,
    scopes: ["https://www.googleapis.com/auth/drive"],
  });
  return _client;
};

const driveRequest = async (opts) => {
  const client = driveClient();
  // JWT.request auto-attaches a fresh access token.
  return client.request(opts);
};

const findFolder = async (name, parentId) => {
  const c = config();
  const escaped = name.replace(/'/g, "\\'");
  const q = `name = '${escaped}' and '${parentId}' in parents and ` +
    `mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
  const res = await driveRequest({
    url: "https://www.googleapis.com/drive/v3/files",
    params: {
      q,
      corpora: "drive",
      driveId: c.sharedDriveId,
      includeItemsFromAllDrives: true,
      supportsAllDrives: true,
      fields: "files(id,name)",
    },
  });
  return res.data.files?.[0]?.id || null;
};

const createFolder = async (name, parentId) => {
  const res = await driveRequest({
    url: "https://www.googleapis.com/drive/v3/files",
    method: "POST",
    params: { supportsAllDrives: true },
    data: { name, mimeType: "application/vnd.google-apps.folder", parents: [parentId] },
  });
  return res.data.id;
};

const folderCache = {};
const ensureFolder = async (name, parentId) => {
  const key = `${parentId}/${name}`;
  if (folderCache[key]) return folderCache[key];
  const id = (await findFolder(name, parentId)) || (await createFolder(name, parentId));
  folderCache[key] = id;
  return id;
};

const ensureYearFolder = async (year) => {
  const c = config();
  if (!c.sharedDriveId) {
    throw new Meteor.Error("drive-config", "googleDrive.sharedDriveId is not configured");
  }
  const rootId = await ensureFolder(c.rootFolder || "Receipts", c.sharedDriveId);
  return ensureFolder(String(year), rootId);
};

const driveUpload = async ({ buffer, filename, mimeType, year }) => {
  const folderId = await ensureYearFolder(year);
  const boundary = `umsme-${Date.now()}-${buffer.length}`;
  const meta = JSON.stringify({ name: filename, parents: [folderId] });
  const body = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${meta}\r\n`),
    Buffer.from(`--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`),
    buffer,
    Buffer.from(`\r\n--${boundary}--`),
  ]);
  const res = await driveRequest({
    url: "https://www.googleapis.com/upload/drive/v3/files",
    method: "POST",
    params: { uploadType: "multipart", supportsAllDrives: true },
    headers: { "Content-Type": `multipart/related; boundary=${boundary}` },
    data: body,
  });
  return res.data.id;
};

const driveDownload = async (fileId) => {
  const res = await driveRequest({
    url: `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}`,
    params: { alt: "media", supportsAllDrives: true },
    responseType: "arraybuffer",
  });
  return Buffer.from(res.data);
};

const driveDelete = async (fileId) => {
  await driveRequest({
    url: `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}`,
    method: "DELETE",
    params: { supportsAllDrives: true },
  });
};

// ---------------------------------------------------------------------------
// Local backend (dev/testing — no Google account needed)
// ---------------------------------------------------------------------------

const localBase = () => {
  const c = config();
  if (!c.localPath) {
    throw new Meteor.Error("drive-config", "googleDrive.localPath is not configured");
  }
  return path.resolve(appRoot, c.localPath);
};

const localUpload = ({ buffer, filename, year }) => {
  const dir = path.join(localBase(), String(year));
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, filename), buffer);
  return `${year}/${filename}`; // fileId = path relative to localPath
};

const localDownload = (fileId) => fs.readFileSync(path.join(localBase(), fileId));

const localDelete = (fileId) => {
  const full = path.join(localBase(), fileId);
  if (fs.existsSync(full)) fs.unlinkSync(full);
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Store a receipt image and return an opaque fileId.
 * @param {{ buffer: Buffer, baseName: string, mimeType: string, date: Date }} opts
 * @returns {Promise<string>} fileId
 */
export const uploadImage = async ({ buffer, baseName, mimeType, date }) => {
  const year = (date || new Date()).getFullYear();
  const filename = `${baseName}.${extFor(mimeType)}`;
  if (config().backend === "local") {
    return localUpload({ buffer, filename, year });
  }
  return driveUpload({ buffer, filename, mimeType, year });
};

/**
 * Fetch a receipt image's raw bytes.
 * @param {string} fileId
 * @returns {Promise<Buffer>}
 */
export const downloadImage = async (fileId) => {
  if (config().backend === "local") return localDownload(fileId);
  return driveDownload(fileId);
};

/**
 * Delete a receipt image. Best-effort: logs and swallows errors so an
 * abort/replace is not blocked by a storage hiccup.
 * @param {string} fileId
 */
export const deleteImage = async (fileId) => {
  if (!fileId) return;
  try {
    if (config().backend === "local") {
      localDelete(fileId);
    } else {
      await driveDelete(fileId);
    }
  } catch (err) {
    console.error(`[googleDrive] failed to delete ${fileId}:`, err.message);
  }
};
