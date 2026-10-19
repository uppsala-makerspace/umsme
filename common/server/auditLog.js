import { AuditLog } from '/imports/common/collections/auditLog';

/** A year: entries older than that are removed by MongoDB (TTL index on `at`). */
export const AUDIT_LOG_TTL_SECONDS = 365 * 24 * 60 * 60;

export const ensureAuditLogIndexes = async () => {
  const raw = AuditLog.rawCollection();
  await raw.createIndex({ at: 1 }, { expireAfterSeconds: AUDIT_LOG_TTL_SECONDS, name: 'at_ttl' });
  await raw.createIndex({ domain: 1, docId: 1, at: -1 }, { name: 'domain_doc' });
};

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/**
 * The fields that differ between two versions of a document, with their old
 * and new values. Top-level fields only; `_id` and `updatedAt` are left out.
 */
export const changedFields = (before = {}, after = {}) => {
  const changes = {};
  for (const field of new Set([...Object.keys(before || {}), ...Object.keys(after || {})])) {
    if (field === '_id' || field === 'updatedAt') continue;
    const from = before?.[field];
    const to = after?.[field];
    if (!same(from, to)) changes[field] = { from: from ?? null, to: to ?? null };
  }
  return changes;
};

/**
 * Record a write. `before` is null for a create, `after` null for a delete.
 *
 * @param {{ userId: string, domain: string, action: string, docId: string,
 *           before?: object|null, after?: object|null }} entry
 */
export const recordChange = ({ userId, domain, action, docId, before = null, after = null }) =>
  AuditLog.insertAsync({
    userId: userId || null,
    domain,
    action,
    docId,
    changes: changedFields(before, after),
    at: new Date(),
  });
