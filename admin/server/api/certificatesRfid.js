import { WebApp } from "meteor/webapp";
import { Certificates } from "/imports/common/collections/certificates";
import { Attestations } from "/imports/common/collections/attestations";
import { Members } from "/imports/common/collections/members";

// Access control for this endpoint is enforced upstream in nginx via
// `allow`/`deny` directives on the location block. Anything reaching the
// app process has already been vetted at the network layer.

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
