/**
 * Quarterly Lab Tests (QLAB)
 *
 * Tests for Q1-Q4 quarterly lab scenarios from MEMBERSHIP_RULES.md.
 *
 * Q1: First-time member buys quarterly -> ERROR
 * Q2: Has membership, no lab -> labend = now + 3mo
 * Q3: Has membership + lab, memberend != labend -> labend = labend + 3mo
 * Q4: Has membership + lab, memberend == labend -> same as Q3
 * Q5 variant: Quarterly extends labend past memberend -> memberend = labend
 */

import assert from 'assert';
import { Memberships } from '/imports/common/collections/memberships';
import { Members } from '/imports/common/collections/members';
import {
  clearTestData,
  createTestMember,
  processPayment,
} from '../test-helpers';

/**
 * Helper to add months to a date
 */
function addMonths(date, months) {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

/**
 * Helper to check if two dates are within a given number of seconds of each other
 */
function datesWithinSeconds(date1, date2, seconds = 60) {
  const diff = Math.abs(date1.getTime() - date2.getTime());
  return diff < seconds * 1000;
}

describe('Quarterly Lab Tests', function () {
  this.timeout(10000);

  beforeEach(async function () {
    await clearTestData();
  });

  it('QLAB-001 (Q1): First-time member buying quarterly returns error', async function () {
    // First-time member (no member date)
    const memberId = await createTestMember();
    const swishId = 'qlab-001-' + Date.now();

    const membership = await processPayment(memberId, swishId, 'memberQuarterlyLab', 350);

    // Should NOT create membership for first-time member buying quarterly
    assert.ok(!membership, 'No membership should be created');

    // Member should have paymentError set
    const member = await Members.findOneAsync(memberId);
    assert.strictEqual(member.paymentError, 'QUARTERLY_WITHOUT_BASE_MEMBERSHIP');
  });

  it('QLAB-002 (Q2): Member with active membership, no lab -> labend = now + 3mo', async function () {
    // Member with active membership (6 months out) but no lab
    const memberEnd = addMonths(new Date(), 6);
    const memberId = await createTestMember({ member: memberEnd });
    const swishId = 'qlab-002-' + Date.now();
    const now = new Date();

    const membership = await processPayment(memberId, swishId, 'memberQuarterlyLab', 350);

    assert.ok(membership, 'Membership should be created');
    assert.strictEqual(membership.type, 'lab');

    // labend should be now + 3 months
    const expectedLabEnd = addMonths(now, 3);

    assert.ok(
      datesWithinSeconds(membership.labend, expectedLabEnd),
      `labend should be ~${expectedLabEnd.toISOString()}, got ${membership.labend.toISOString()}`
    );

    // memberend should stay unchanged (3mo < 6mo)
    assert.ok(
      datesWithinSeconds(membership.memberend, memberEnd),
      `memberend should stay at ${memberEnd.toISOString()}, got ${membership.memberend.toISOString()}`
    );
  });

  it('QLAB-003 (Q3): Member with active lab, memberend != labend -> labend = labend + 3mo', async function () {
    // Member with active membership and lab, but different end dates
    const memberEnd = addMonths(new Date(), 8);
    const labEnd = addMonths(new Date(), 4);
    const memberId = await createTestMember({ member: memberEnd, lab: labEnd });
    const swishId = 'qlab-003-' + Date.now();

    const membership = await processPayment(memberId, swishId, 'memberQuarterlyLab', 350);

    assert.ok(membership, 'Membership should be created');
    assert.strictEqual(membership.type, 'lab');

    // labend should be previous labend + 3 months
    const expectedLabEnd = addMonths(labEnd, 3);

    assert.ok(
      datesWithinSeconds(membership.labend, expectedLabEnd),
      `labend should be ~${expectedLabEnd.toISOString()}, got ${membership.labend.toISOString()}`
    );

    // memberend should stay unchanged (7mo < 8mo)
    assert.ok(
      datesWithinSeconds(membership.memberend, memberEnd),
      `memberend should stay at ${memberEnd.toISOString()}, got ${membership.memberend.toISOString()}`
    );
  });

  it('QLAB-004 (Q4): Member with active lab, memberend == labend -> labend = labend + 3mo', async function () {
    // Member with active membership and lab with same end dates
    const endDate = addMonths(new Date(), 6);
    const memberId = await createTestMember({ member: endDate, lab: endDate });
    const swishId = 'qlab-004-' + Date.now();

    const membership = await processPayment(memberId, swishId, 'memberQuarterlyLab', 350);

    assert.ok(membership, 'Membership should be created');
    assert.strictEqual(membership.type, 'lab');

    // labend should be previous labend + 3 months
    const expectedLabEnd = addMonths(endDate, 3);

    assert.ok(
      datesWithinSeconds(membership.labend, expectedLabEnd),
      `labend should be ~${expectedLabEnd.toISOString()}, got ${membership.labend.toISOString()}`
    );

    // memberend should be extended to match labend (9mo > 6mo)
    assert.ok(
      datesWithinSeconds(membership.memberend, expectedLabEnd),
      `memberend should be extended to ${expectedLabEnd.toISOString()}, got ${membership.memberend.toISOString()}`
    );
  });

  it('QLAB-005 (Q3 variant): Quarterly extends labend past memberend -> memberend = labend', async function () {
    // Member with membership ending soon, but lab extending past it
    const memberEnd = addMonths(new Date(), 2); // Membership ends in 2 months
    const labEnd = addMonths(new Date(), 1); // Lab ends in 1 month
    const memberId = await createTestMember({ member: memberEnd, lab: labEnd });
    const swishId = 'qlab-005-' + Date.now();

    const membership = await processPayment(memberId, swishId, 'memberQuarterlyLab', 350);

    assert.ok(membership, 'Membership should be created');

    // labend should be labEnd + 3 months = 4 months from now
    const expectedLabEnd = addMonths(labEnd, 3);

    // memberend should be extended to match labend (since labend > memberEnd)
    assert.ok(
      datesWithinSeconds(membership.labend, expectedLabEnd),
      `labend should be ~${expectedLabEnd.toISOString()}, got ${membership.labend.toISOString()}`
    );
    assert.ok(
      datesWithinSeconds(membership.memberend, expectedLabEnd),
      `memberend should be extended to match labend ~${expectedLabEnd.toISOString()}, got ${membership.memberend.toISOString()}`
    );
  });
});
