import assert from 'assert';
import { schemas } from '/imports/common/lib/schemas';
import { storageDeliveryStateErrors } from '/imports/common/lib/storageRules';

describe('storage schemas', function () {
  it('accepts a durable missing-template delivery without invented content', function () {
    const now = new Date('2026-09-10T12:00:00.000Z');
    const context = schemas.storageNotificationDelivery.newContext();
    context.validate({
      owner: 'member',
      decision_type: 'warning',
      decision_id: 'warning-id',
      render_status: 'missing_template',
      render_error: 'No matching template',
      email: { status: 'unavailable', attempts: 0 },
      sms: { status: 'unavailable', attempts: 0 },
      created_at: now,
      created_by: 'administrator',
      updatedAt: now,
    });
    assert.strictEqual(context.isValid(), true);
  });

  it('rejects a deliverable email without its immutable render snapshot', function () {
    const errors = storageDeliveryStateErrors({
      render_status: 'render_failed',
      render_error: 'Rendering failed',
      email: { status: 'pending', attempts: 0 },
      sms: { status: 'unavailable', attempts: 0 },
    });
    assert.ok(errors.includes('email_render_required'));
    assert.ok(errors.includes('email_recipient_required'));
    assert.ok(errors.includes('email_sender_required'));
    assert.ok(errors.includes('email_subject_required'));
    assert.ok(errors.includes('email_content_required'));
  });
});
