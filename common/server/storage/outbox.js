import { Random } from 'meteor/random';
import { StorageNotificationDeliveries } from '/imports/common/collections/storage';
import { STORAGE_SCHEMAS, insertStorageDocument } from './db';

/**
 * Phase 3 durable outbox boundary. Phase 4 replaces the render-unavailable
 * payload with immutable template snapshots and performs delivery after commit.
 */
export const createStorageNotificationOutbox = async ({
  owner,
  decisionType,
  decisionId,
  createdBy,
  deliveryId,
  renderContext,
  now = new Date(),
}, { session } = {}) => {
  const existing = await StorageNotificationDeliveries.findOneAsync({
    decision_type: decisionType,
    decision_id: decisionId,
  });
  if (existing) return existing._id;
  const document = {
    _id: deliveryId || Random.id(),
    owner: owner._id,
    decision_type: decisionType,
    decision_id: decisionId,
    ...(owner.email ? { recipient_email: owner.email } : {}),
    ...(owner.mobile ? { recipient_mobile: owner.mobile } : {}),
    ...(renderContext ? { render_context: renderContext } : {}),
    render_status: 'render_failed',
    render_error: 'Storage notification rendering is not installed yet',
    email: { status: 'unavailable', attempts: 0, last_error: 'Delivery phase not installed' },
    sms: { status: 'unavailable', attempts: 0, last_error: 'Delivery phase not installed' },
    created_at: now,
    created_by: createdBy,
    updatedAt: now,
  };
  return insertStorageDocument(
    StorageNotificationDeliveries,
    STORAGE_SCHEMAS.delivery,
    document,
    { session },
  );
};
