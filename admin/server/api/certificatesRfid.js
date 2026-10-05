import { WebApp } from "meteor/webapp";
import { Certificates } from "/imports/common/collections/certificates";
import { Attestations } from "/imports/common/collections/attestations";
import { Members } from "/imports/common/collections/members";
import { flagParam, rfidExport } from "/imports/common/lib/certificateRfid";

// Access control for this endpoint is enforced upstream in nginx via
// `allow`/`deny` directives on the location block. Anything reaching the
// app process has already been vetted at the network layer.

const sendJson = (res, status, body) => {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
};

WebApp.handlers.use("/api/certificates", async (req, res) => {
  // The mount strips the prefix; req.url begins with "/<certId>/rfid"
  const [url, query = ""] = req.url.split("?");
  // ?includeNames adds a members list with each tag's owner (docs/certificates.md).
  const includeNames = flagParam(new URLSearchParams(query).get("includeNames"));
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
  const members = await Members.find(
    { _id: { $in: memberIds }, rfid: { $exists: true, $ne: "" } },
    { fields: { rfid: 1, name: 1 } }
  ).fetchAsync();

  sendJson(res, 200, rfidExport(certificate, members, { includeNames }));
});
