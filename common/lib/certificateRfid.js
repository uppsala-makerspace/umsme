/**
 * The RFID exports: for one certificate, the tags of members with a valid
 * attestation, optionally with their names; and for every certificate with
 * machines, one row per tag and machine. Served by admin at
 * GET /api/certificates/<certificateId>/rfid and GET /api/certificates/rfid —
 * see docs/certificates.md.
 *
 * Pure: plain objects in, plain objects out, so it can be unit tested.
 */

import { formatRfid } from "./rfid";

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

/** A tag as the readers want it, 03-D7-3B-99, from either way it is stored. */
export { formatRfid as formatTag };

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
    rfids: withTag.map((m) => formatRfid(m.rfid)),
  };
  if (includeNames) {
    body.members = withTag
      .map((m) => ({ rfid: formatRfid(m.rfid), name: m.name || "" }))
      .sort((a, b) => a.name.localeCompare(b.name, "sv"));
  }
  return body;
};

/**
 * The export of every certificate's machines: a row for each holder with a tag
 * and each machine of a certificate they hold, in the certificate's role. A
 * tag given the same machine and role by two certificates is one row; with
 * both roles, two. Sorted by machine, then name.
 *
 * @param {Array<{_id: string, machines?: string[], machineRole?: string}>} certificates
 * @param {Object<string, Array<{rfid?: string, name?: string}>>} holdersByCertificate - by certificate id
 * @returns {Array<{tag: string, machine: string, name: string, role: string}>}
 */
export const machineExport = (certificates, holdersByCertificate) => {
  const rows = new Map();
  for (const certificate of certificates) {
    const role = certificate.machineRole || "user";
    for (const holder of holdersByCertificate[certificate._id] || []) {
      if (!holder.rfid) continue;
      const tag = formatRfid(holder.rfid);
      for (const machine of certificate.machines || []) {
        const key = [tag, machine, role].join("\n");
        if (!rows.has(key)) rows.set(key, { tag, machine, name: holder.name || "", role });
      }
    }
  }
  return [...rows.values()].sort((a, b) =>
    a.machine.localeCompare(b.machine, "sv") || a.name.localeCompare(b.name, "sv") || a.role.localeCompare(b.role));
};
