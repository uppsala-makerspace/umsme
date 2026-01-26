/**
 * Switching Scenarios Tests (SWITCH)
 *
 * Tests for S1-S2 upgrade/downgrade scenarios from MEMBERSHIP_RULES.md.
 *
 * S1: Membership -> memberLab (upgrade to lab)
 *   - S1a: If memberend > now + 2mo: labend = memberend = now + 14mo
 *   - S1b: If memberend <= now + 2mo: labend = memberend = memberend + 1y
 *
 * S2: Lab -> memberBase (downgrade)
 *   - labend: unchanged
 *   - memberend = memberend + 1y
 */

import assert from 'assert';
import {
  clearTestData,
  createTestMember,
  processPayment,
} from './helpers';

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

describe('Switching Scenarios Tests', function () {
  this.timeout(10000);

  beforeEach(async function () {
    await clearTestData();
  });

  it('SWITCH-001 (S1a): Base->Lab with memberend > now + 2mo -> labend = memberend = now + 14mo', async function () {
    // Member with active membership more than 2 months out (e.g., 6 months)
    const memberEnd = addMonths(new Date(), 6);
    const memberId = await createTestMember({ member: memberEnd });
    const now = new Date();

    const membership = await processPayment(memberId, 'memberLab', 1200);

    assert.ok(membership, 'Membership should be created');
    assert.strictEqual(membership.type, 'labandmember');

    // Both should be now + 14 months (compensation for wasted membership value)
    const expectedEnd = addMonths(now, 14);

    assert.ok(
      datesWithinSeconds(membership.memberend, expectedEnd),
      `memberend should be ~${expectedEnd.toISOString()}, got ${membership.memberend.toISOString()}`
    );
    assert.ok(
      datesWithinSeconds(membership.labend, expectedEnd),
      `labend should be ~${expectedEnd.toISOString()}, got ${membership.labend.toISOString()}`
    );
  });

  it('SWITCH-002 (S1b): Base->Lab with memberend <= now + 2mo -> labend = memberend = memberend + 1y', async function () {
    // Member with active membership within 2 months (e.g., 1 month out)
    const memberEnd = addMonths(new Date(), 1);
    const memberId = await createTestMember({ member: memberEnd });

    const membership = await processPayment(memberId, 'memberLab', 1200);

    assert.ok(membership, 'Membership should be created');
    assert.strictEqual(membership.type, 'labandmember');

    // Both should be memberend + 1 year
    const expectedEnd = addYears(memberEnd, 1);

    assert.ok(
      datesWithinSeconds(membership.memberend, expectedEnd),
      `memberend should be ~${expectedEnd.toISOString()}, got ${membership.memberend.toISOString()}`
    );
    assert.ok(
      datesWithinSeconds(membership.labend, expectedEnd),
      `labend should be ~${expectedEnd.toISOString()}, got ${membership.labend.toISOString()}`
    );
  });

  it('SWITCH-003 (S2): Lab->Base -> labend unchanged, memberend + 1y', async function () {
    // Member with active lab membership
    const memberEnd = addMonths(new Date(), 6);
    const labEnd = addMonths(new Date(), 6);
    const memberId = await createTestMember({ member: memberEnd, lab: labEnd });

    const membership = await processPayment(memberId, 'memberBase', 300);

    assert.ok(membership, 'Membership should be created');
    assert.strictEqual(membership.type, 'member');

    // memberend should be previous memberend + 1 year
    const expectedMemberEnd = addYears(memberEnd, 1);

    assert.ok(
      datesWithinSeconds(membership.memberend, expectedMemberEnd),
      `memberend should be ~${expectedMemberEnd.toISOString()}, got ${membership.memberend.toISOString()}`
    );

    // labend should be kept from existing lab (preserved, not lost)
    // Note: In the current implementation, labend is preserved if hasActiveLab
    assert.ok(
      datesWithinSeconds(membership.labend, labEnd),
      `labend should remain ~${labEnd.toISOString()}, got ${membership.labend ? membership.labend.toISOString() : 'null'}`
    );
  });
});
