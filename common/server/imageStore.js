import { Meteor } from "meteor/meteor";
import fs from "fs";
import path from "path";

/**
 * Image storage factory with two backends:
 *
 *  - "drive": treats a Google shared drive as object storage, bucketed into
 *    one folder per year under a configurable root folder.
 *  - "local": writes under a configured directory (dev/testing, or content
 *    that doesn't need off-server storage, e.g. workshop images).
 *
 * `createImageStore(getConfig, name)` returns `{ uploadImage, downloadImage,
 * deleteImage }` bound to the given config source:
 *   {
 *     "backend": "drive" | "local",
 *     // backend "drive":
 *     "credentials": { "client_email": "...", "private_key": "..." },  // or:
 *     "keyFile": "config/expense-service-account.json",               // path (relative to PWD)
 *     "sharedDriveId": "0A...",
 *     "rootFolder": "Receipts",
 *     // backend "local":
 *     "localPath": "/srv/umsme/receipts"   // absolute, or relative to PWD
 *   }
 *
 * `fileId` is an opaque handle (a Drive file id, or a path relative to
 * localPath); callers store it and do not need to care which backend it came
 * from, so a store can switch backend without code changes.
 */

const appRoot = process.env.PWD;

const extFor = (mimeType) => {
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  if (mimeType === "image/heic") return "heic";
  return "jpg";
};

export const createImageStore = (getConfig, name = "imageStore") => {
  const config = () => getConfig() || {};

  // -------------------------------------------------------------------------
  // Google Drive backend (service-account JWT via google-auth-library + axios)
  // -------------------------------------------------------------------------

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
      throw new Meteor.Error("drive-config", `${name} credentials are not configured`);
    }
    _client = new JWT({
      email: creds.client_email,
      // Tolerate keys whose newlines arrived escaped (literal "\n"), which is
      // common when the key is pasted into JSON/env. A real PEM needs actual
      // line breaks or OpenSSL fails with "DECODER routines::unsupported".
      key: creds.private_key.replace(/\\n/g, "\n"),
      scopes: ["https://www.googleapis.com/auth/drive"],
    });
    return _client;
  };

  const driveRequest = async (opts) => {
    const client = driveClient();
    // JWT.request auto-attaches a fresh access token.
    return client.request(opts);
  };

  const findFolder = async (folderName, parentId) => {
    const c = config();
    const escaped = folderName.replace(/'/g, "\\'");
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

  const createFolder = async (folderName, parentId) => {
    const res = await driveRequest({
      url: "https://www.googleapis.com/drive/v3/files",
      method: "POST",
      params: { supportsAllDrives: true },
      data: { name: folderName, mimeType: "application/vnd.google-apps.folder", parents: [parentId] },
    });
    return res.data.id;
  };

  const folderCache = {};
  const ensureFolder = async (folderName, parentId) => {
    const key = `${parentId}/${folderName}`;
    if (folderCache[key]) return folderCache[key];
    const id = (await findFolder(folderName, parentId)) || (await createFolder(folderName, parentId));
    folderCache[key] = id;
    return id;
  };

  const ensureYearFolder = async (year) => {
    const c = config();
    if (!c.sharedDriveId) {
      throw new Meteor.Error("drive-config", `${name}.sharedDriveId is not configured`);
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

  // Trash rather than permanently delete: on a shared drive, files.delete
  // requires the Manager/organizer role, whereas a Content manager (the least
  // privilege we need for upload/read) is allowed to trash. Trashed files leave
  // the folder and the shared-drive trash auto-purges after 30 days.
  const driveDelete = async (fileId) => {
    await driveRequest({
      url: `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}`,
      method: "PATCH",
      params: { supportsAllDrives: true },
      data: { trashed: true },
    });
  };

  // -------------------------------------------------------------------------
  // Local backend
  // -------------------------------------------------------------------------

  const localBase = () => {
    const c = config();
    if (!c.localPath) {
      throw new Meteor.Error("drive-config", `${name}.localPath is not configured`);
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

  // -------------------------------------------------------------------------
  // Store API
  // -------------------------------------------------------------------------

  /**
   * Store an image and return an opaque fileId.
   * @param {{ buffer: Buffer, baseName: string, mimeType: string, date: Date }} opts
   * @returns {Promise<string>} fileId
   */
  const uploadImage = async ({ buffer, baseName, mimeType, date }) => {
    const year = (date || new Date()).getFullYear();
    const filename = `${baseName}.${extFor(mimeType)}`;
    if (config().backend === "local") {
      return localUpload({ buffer, filename, year });
    }
    return driveUpload({ buffer, filename, mimeType, year });
  };

  /**
   * Fetch an image's raw bytes.
   * @param {string} fileId
   * @returns {Promise<Buffer>}
   */
  const downloadImage = async (fileId) => {
    if (config().backend === "local") return localDownload(fileId);
    return driveDownload(fileId);
  };

  /**
   * Delete an image. Best-effort: logs and swallows errors so an abort/replace
   * is not blocked by a storage hiccup.
   * @param {string} fileId
   */
  const deleteImage = async (fileId) => {
    if (!fileId) return;
    try {
      if (config().backend === "local") {
        localDelete(fileId);
      } else {
        await driveDelete(fileId);
      }
    } catch (err) {
      console.error(`[${name}] failed to delete ${fileId}:`, err.message);
    }
  };

  return { uploadImage, downloadImage, deleteImage };
};
