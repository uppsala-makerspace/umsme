import { Meteor } from "meteor/meteor";
import { WebApp } from "meteor/webapp";
import { timingSafeEqual } from "crypto";
import { Certificates } from "/imports/common/collections/certificates";
import { Attestations } from "/imports/common/collections/attestations";
import { Members } from "/imports/common/collections/members";
import { flagParam, rfidExport, machineExport } from "/imports/common/lib/certificateRfid";

// Every request needs ?apikey= matching private.rfidApiKey in the settings.
// Without the setting nothing is served, so a missing key never opens it.

const sendJson = (res, status, body) => {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
};

/** Whether the given key is the configured one, compared in constant time. */
export const apiKeyMatches = (given, configured) => {
  if (!configured || !given) return false;
  const [a, b] = [Buffer.from(String(given)), Buffer.from(String(configured))];
  return a.length === b.length && timingSafeEqual(a, b);
};

/** The members with a valid attestation of each certificate and a tag, by certificate id. */
const holdersOf = async (certificateIds) => {
  const now = new Date();
  const attestations = await Attestations.find({
    certificateId: { $in: certificateIds },
    certifierId: { $exists: true },
    $or: [{ endDate: { $exists: false } }, { endDate: { $gt: now } }],
  }, { fields: { certificateId: 1, memberId: 1 } }).fetchAsync();
  const members = await Members.find(
    { _id: { $in: [...new Set(attestations.map((a) => a.memberId))] }, rfid: { $exists: true, $ne: "" } },
    { fields: { rfid: 1, name: 1 } },
  ).fetchAsync();
  const byId = new Map(members.map((m) => [m._id, m]));
  const holders = Object.fromEntries(certificateIds.map((id) => [id, []]));
  const seen = new Set();
  for (const a of attestations) {
    const member = byId.get(a.memberId);
    const key = `${a.certificateId}/${a.memberId}`;
    if (!member || seen.has(key)) continue;
    seen.add(key);
    holders[a.certificateId].push(member);
  }
  return holders;
};

WebApp.handlers.use("/api/certificates", async (req, res) => {
  // The mount strips the prefix; req.url is "/rfid" or "/<certId>/rfid".
  const [url, query = ""] = req.url.split("?");
  const params = new URLSearchParams(query);
  const all = /^\/rfid\/?$/.test(url);
  const match = url.match(/^\/([^/]+)\/rfid\/?$/);
  if (!all && !match) {
    res.writeHead(404);
    res.end();
    return;
  }
  if (req.method !== "GET") {
    res.writeHead(405);
    res.end("Only GET is supported");
    return;
  }
  if (!apiKeyMatches(params.get("apikey"), Meteor.settings?.private?.rfidApiKey)) {
    sendJson(res, 401, { error: "Invalid API key" });
    return;
  }

  if (all) {
    const certificates = await Certificates.find(
      { "machines.0": { $exists: true } },
      { fields: { machines: 1, machineRole: 1 } },
    ).fetchAsync();
    const holders = await holdersOf(certificates.map((c) => c._id));
    sendJson(res, 200, machineExport(certificates, holders));
    return;
  }

  const certificateId = decodeURIComponent(match[1]);
  const certificate = await Certificates.findOneAsync(certificateId);
  if (!certificate) {
    sendJson(res, 404, { error: "Certificate not found" });
    return;
  }
  // ?includeNames adds a members list with each tag's owner (docs/certificates.md).
  const holders = await holdersOf([certificateId]);
  sendJson(res, 200, rfidExport(certificate, holders[certificateId], { includeNames: flagParam(params.get("includeNames")) }));
});
