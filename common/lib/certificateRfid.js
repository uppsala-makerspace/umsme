/**
 * The RFID export for a certificate: the tags of members with a valid
 * attestation, optionally with their names. Served by admin at
 * GET /api/certificates/<certificateId>/rfid — see docs/certificates.md.
 *
 * Pure: plain objects in, plain objects out, so it can be unit tested.
 */

/**
 * Whether a query parameter turns a flag on. Present without a value
 * (`?includeNames`), `true` or `1` mean on; absent, `false` or `0` mean off.
 *
 * @param {string|null} value - URLSearchParams.get() result
 * @returns {boolean}
 */
export const flagParam = (value) => {
  if (value === null || value === undefined) return false;
  const v = String(value).trim().toLowerCase();
  return v === "" || v === "true" || v === "1";
};

/**
 * Build the response body.
 *
 * @param {object} certificate - The certificate, for its name
 * @param {Array<{rfid?: string, name?: string}>} members - Members with a valid attestation
 * @param {{includeNames?: boolean}} options
 * @returns {{name: string, rfids: string[], members?: Array<{rfid: string, name: string}>}}
 */
export const rfidExport = (certificate, members, { includeNames = false } = {}) => {
  const withTag = members.filter((m) => m.rfid);
  const body = {
    name: certificate?.name?.sv || certificate?.name?.en || "",
    rfids: withTag.map((m) => m.rfid),
  };
  if (includeNames) {
    body.members = withTag
      .map((m) => ({ rfid: m.rfid, name: m.name || "" }))
      .sort((a, b) => a.name.localeCompare(b.name, "sv"));
  }
  return body;
};
