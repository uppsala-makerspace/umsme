/**
 * Renewal Timing Tests (RENEW)
 *
 * Tests for grace period and extension timing scenarios.
 *
 * From MEMBERSHIP_RULES.md:
 * - First-time members: 14 days grace period (for certification)
 * - Returning members: 0 days grace period
 * - Early renewal: extends from current end date
 * - Late renewal: extends from payment date
 */

import assert from 'assert';
import { Memberships } from '/imports/common/collections/memberships';
import {
  clearTestData,
  createTestMember,
  processPayment,
} from '../test-helpers';

/**
 * Helper to add days to a date
 */
function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Helper to add months to a date
 */
function addMonths(date, months) {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

/**
 * Helper to add years to a date
 */
function addYears(date, years) {
  const result = new Date(date);
  result.setFullYear(result.getFullYear() + years);
  return result;
}

/**
 * Helper to check if two dates are within a given number of seconds of each other
 */
function datesWithinSeconds(date1, date2, seconds = 60) {
  const diff = Math.abs(date1.getTime() - date2.getTime());
  return diff < seconds * 1000;
}

describe('Renewal Timing Tests', function () {
  this.timeout(10000);

  beforeEach(async function () {
    await clearTestData();
  });

  it('RENEW-001: First-time memberBase gets 14-day grace period + 1 year', async function () {
    const memberId = await createTestMember();
    const swishId = 'renew-001-' + Date.now();
    const now = new Date();

    const membership = await processPayment(memberId, swishId, 'memberBase', 300);

    assert.ok(membership, 'Membership should be created');

    // Expected: now + 14 days + 1 year
    const expectedEnd = addYears(addDays(now, 14), 1);

    assert.ok(
      datesWithinSeconds(membership.memberend, expectedEnd),
      `memberend should be ~${expectedEnd.toISOString()}, got ${membership.memberend.toISOString()}`
    );
  });

  it('RENEW-002: Renewal before expiry extends from currentMemberend + 1 year', async function () {
    // Create member with existing membership that expires in 6 months
    const futureDate = addMonths(new Date(), 6);
    const memberId = await createTestMember({ member: futureDate });
    const swishId = 'renew-002-' + Date.now();

    const membership = await processPayment(memberId, swishId, 'memberBase', 300);

    assert.ok(membership, 'Membership should be created');

    // Expected: currentMemberend + 1 year (not from payment date)
    const expectedEnd = addYears(futureDate, 1);

    assert.ok(
      datesWithinSeconds(membership.memberend, expectedEnd),
      `memberend should be ~${expectedEnd.toISOString()}, got ${membership.memberend.toISOString()}`
    );
  });

  it('RENEW-003: Renewal after expiry extends from payment date + 1 year', async function () {
    // Create member with expired membership (1 month ago)
    const pastDate = addMonths(new Date(), -1);
    const memberId = await createTestMember({ member: pastDate });
    const swishId = 'renew-003-' + Date.now();
    const now = new Date();

    const membership = await processPayment(memberId, swishId, 'memberBase', 300);

    assert.ok(membership, 'Membership should be created');

    // Expected: payment date + 1 year (no grace period for returning members)
    const expectedEnd = addYears(now, 1);

    assert.ok(
      datesWithinSeconds(membership.memberend, expectedEnd),
      `memberend should be ~${expectedEnd.toISOString()}, got ${membership.memberend.toISOString()}`
    );
  });

  it('RENEW-004: First-time memberLab gets 14-day grace + 1 year for both dates', async function () {
    const memberId = await createTestMember();
    const swishId = 'renew-004-' + Date.now();
    const now = new Date();

    const membership = await processPayment(memberId, swishId, 'memberLab', 1200);

    assert.ok(membership, 'Membership should be created');
    assert.strictEqual(membership.type, 'labandmember');

    // Expected: now + 14 days + 1 year for both memberend and labend
    const expectedEnd = addYears(addDays(now, 14), 1);

    assert.ok(
      datesWithinSeconds(membership.memberend, expectedEnd),
      `memberend should be ~${expectedEnd.toISOString()}, got ${membership.memberend.toISOString()}`
    );
    assert.ok(
      datesWithinSeconds(membership.labend, expectedEnd),
      `labend should be ~${expectedEnd.toISOString()}, got ${membership.labend.toISOString()}`
    );
  });

  it('RENEW-005: Lab renewal before expiry extends labend from current', async function () {
    // Create member with existing lab membership that expires in 6 months
    const memberEnd = addMonths(new Date(), 8);
    const labEnd = addMonths(new Date(), 6);
    const memberId = await createTestMember({ member: memberEnd, lab: labEnd });
    const swishId = 'renew-005-' + Date.now();

    const membership = await processPayment(memberId, swishId, 'memberLab', 1200);

    assert.ok(membership, 'Membership should be created');

    // labend should extend from current labEnd
    const expectedLabEnd = addYears(labEnd, 1);

    assert.ok(
      datesWithinSeconds(membership.labend, expectedLabEnd),
      `labend should be ~${expectedLabEnd.toISOString()}, got ${membership.labend.toISOString()}`
    );
  });

  it('RENEW-006: Lab renewal after expiry with active membership triggers upgrade path (S1)', async function () {
    // Create member with existing membership but expired lab (1 month ago)
    // NOTE: Current implementation treats expired lab + active membership as
    // "upgrade to lab" (S1), not "renewal". This is intentional to compensate
    // for the "wasted" membership value when upgrading mid-membership.
    const memberEnd = addMonths(new Date(), 6); // Active, > 2 months away
    const labEnd = addMonths(new Date(), -1); // Expired
    const memberId = await createTestMember({ member: memberEnd, lab: labEnd });
    const swishId = 'renew-006-' + Date.now();
    const now = new Date();

    const membership = await processPayment(memberId, swishId, 'memberLab', 1200);

    assert.ok(membership, 'Membership should be created');

    // Per S1a: memberend > now + 2mo, so labend = memberend = now + 14 months
    const expectedEnd = addMonths(now, 14);

    assert.ok(
      datesWithinSeconds(membership.labend, expectedEnd),
      `labend should be ~${expectedEnd.toISOString()}, got ${membership.labend.toISOString()}`
    );
    assert.ok(
      datesWithinSeconds(membership.memberend, expectedEnd),
      `memberend should be ~${expectedEnd.toISOString()}, got ${membership.memberend.toISOString()}`
    );
  });
});
