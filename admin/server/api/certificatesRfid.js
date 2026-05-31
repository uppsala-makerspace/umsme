import { Meteor } from "meteor/meteor";
import { WebApp } from "meteor/webapp";
import { Certificates } from "/imports/common/collections/certificates";
import { Attestations } from "/imports/common/collections/attestations";
import { Members } from "/imports/common/collections/members";

const PATH_PREFIX = "/api/certificates/";
const PATH_SUFFIX = "/rfid";

const allowedIps = () =>
  (Meteor.settings?.private?.certificateRfidApi?.allowedIps || []).map(ip => ip.trim()).filter(Boolean);

const normalizeIp = (ip) => {
  if (!ip) return "";
  // IPv6-mapped IPv4 like "::ffff:127.0.0.1"
  return ip.replace(/^::ffff:/, "").trim();
};

const requestIp = (req) => {
  const fwd = req.headers["x-forwarded-for"];
  if (fwd) {
    return normalizeIp(String(fwd).split(",")[0]);
  }
  return normalizeIp(req.socket?.remoteAddress || "");
};

const sendJson = (res, status, body) => {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
};

WebApp.handlers.use("/api/certificates", async (req, res) => {
  // The mount strips the prefix; req.url begins with "/<certId>/rfid"
  const url = req.url.split("?")[0];
  const match = url.match(/^\/([^/]+)\/rfid\/?$/);
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

  const ip = requestIp(req);
  const allow = allowedIps();
  if (allow.length === 0 || !allow.includes(ip)) {
    console.warn(`[certificatesRfid] denied request from ip="${ip}"`);
    res.writeHead(403);
    res.end();
    return;
  }

  const certificateId = decodeURIComponent(match[1]);
  const certificate = await Certificates.findOneAsync(certificateId);
  if (!certificate) {
    sendJson(res, 404, { error: "Certificate not found" });
    return;
  }

  const now = new Date();
  const attestations = await Attestations.find({
    certificateId,
    certifierId: { $exists: true },
    $or: [{ endDate: { $exists: false } }, { endDate: { $gt: now } }],
  }).fetchAsync();

  const memberIds = [...new Set(attestations.map(a => a.memberId))];
  const members = await Members.find({
    _id: { $in: memberIds },
    rfid: { $exists: true, $ne: "" },
  }).fetchAsync();

  const rfids = members.map(m => m.rfid).filter(Boolean);

  sendJson(res, 200, {
    name: certificate.name?.sv || certificate.name?.en || "",
    rfids,
  });
});
