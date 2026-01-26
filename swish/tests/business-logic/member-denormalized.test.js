/**
 * Member Denormalized Field Tests (DENORM)
 *
 * Tests that verify member objects are updated with denormalized fields
 * (member, lab, family) after payment, and that family members are also updated.
 */

import assert from 'assert';
import { Members } from '/imports/common/collections/members';
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
 * Helper to add days to a date
 */
function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
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
  if (!date1 || !date2) return false;
  const diff = Math.abs(date1.getTime() - date2.getTime());
  return diff < seconds * 1000;
}

/**
 * Create a family member linked to the primary member
 */
async function createFamilyMember(primaryMemberId, overrides = {}) {
  const memberId = await Members.insertAsync({
    mid: `FAM${Date.now().toString(36).slice(-5)}`,
    name: 'Family Member',
    email: 'family@example.com',
    infamily: primaryMemberId,
    ...overrides,
  });
  return memberId;
}

describe('Member Denormalized Field Tests', function () {
  this.timeout(10000);

  beforeEach(async function () {
    await clearTestData();
  });

  describe('Primary Member Updates', function () {
    it('DENORM-001: memberBase updates member.member and member.family on member object', async function () {
      const memberId = await createTestMember();
      const now = new Date();

      await processPayment(memberId, 'memberBase', 300);

      const member = await Members.findOneAsync(memberId);

      // member field should be updated (now + 14 days grace + 1 year)
      const expectedMemberEnd = addYears(addDays(now, 14), 1);
      assert.ok(member.member, 'member.member should be set');
      assert.ok(
        datesWithinSeconds(member.member, expectedMemberEnd),
        `member.member should be ~${expectedMemberEnd.toISOString()}, got ${member.member.toISOString()}`
      );

      // family should be false for memberBase
      assert.strictEqual(member.family, false, 'member.family should be false');

      // paymentError should be cleared
      assert.strictEqual(member.paymentError, null, 'paymentError should be cleared');
    });

    it('DENORM-002: memberLab updates member.member, member.lab, and member.family', async function () {
      const memberId = await createTestMember();
      const now = new Date();

      await processPayment(memberId, 'memberLab', 1200);

      const member = await Members.findOneAsync(memberId);

      // Both member and lab should be set
      const expectedEnd = addYears(addDays(now, 14), 1);
      assert.ok(member.member, 'member.member should be set');
      assert.ok(member.lab, 'member.lab should be set');

      assert.ok(
        datesWithinSeconds(member.member, expectedEnd),
        `member.member should be ~${expectedEnd.toISOString()}`
      );
      assert.ok(
        datesWithinSeconds(member.lab, expectedEnd),
        `member.lab should be ~${expectedEnd.toISOString()}`
      );

      assert.strictEqual(member.family, false);
    });

    it('DENORM-003: familyBase updates member.family to true', async function () {
      const memberId = await createTestMember();

      await processPayment(memberId, 'familyBase', 500);

      const member = await Members.findOneAsync(memberId);
      assert.strictEqual(member.family, true, 'member.family should be true');
    });

    it('DENORM-004: memberQuarterlyLab updates member.lab for existing member', async function () {
      // Create member with existing membership
      const memberEnd = addMonths(new Date(), 6);
      const memberId = await createTestMember({ member: memberEnd });
      const now = new Date();

      await processPayment(memberId, 'memberQuarterlyLab', 350);

      const member = await Members.findOneAsync(memberId);

      // lab should be set to now + 3 months
      const expectedLabEnd = addMonths(now, 3);
      assert.ok(member.lab, 'member.lab should be set');
      assert.ok(
        datesWithinSeconds(member.lab, expectedLabEnd),
        `member.lab should be ~${expectedLabEnd.toISOString()}`
      );
    });

    it('DENORM-005: Previous paymentError is cleared after successful payment', async function () {
      // Create member with an existing paymentError
      const memberId = await createTestMember({ paymentError: 'SOME_ERROR' });

      await processPayment(memberId, 'memberBase', 300);

      const member = await Members.findOneAsync(memberId);
      assert.strictEqual(member.paymentError, null, 'paymentError should be cleared');
    });
  });

  describe('Family Member Updates', function () {
    it('DENORM-006: familyBase updates all family members with same dates', async function () {
      const primaryId = await createTestMember();
      const family1Id = await createFamilyMember(primaryId, { name: 'Family 1' });
      const family2Id = await createFamilyMember(primaryId, { name: 'Family 2' });

      await processPayment(primaryId, 'familyBase', 500);

      // Check primary member
      const primary = await Members.findOneAsync(primaryId);
      assert.strictEqual(primary.family, true);
      assert.ok(primary.member, 'primary.member should be set');

      // Check family members have same dates and family flag
      const family1 = await Members.findOneAsync(family1Id);
      const family2 = await Members.findOneAsync(family2Id);

      assert.strictEqual(family1.family, true, 'family1.family should be true');
      assert.strictEqual(family2.family, true, 'family2.family should be true');

      assert.ok(
        datesWithinSeconds(family1.member, primary.member),
        'family1.member should match primary.member'
      );
      assert.ok(
        datesWithinSeconds(family2.member, primary.member),
        'family2.member should match primary.member'
      );
    });

    it('DENORM-007: familyLab updates all family members with member and lab dates', async function () {
      const primaryId = await createTestMember();
      const familyId = await createFamilyMember(primaryId);

      await processPayment(primaryId, 'familyLab', 1400);

      const primary = await Members.findOneAsync(primaryId);
      const family = await Members.findOneAsync(familyId);

      // Both should have family=true
      assert.strictEqual(primary.family, true);
      assert.strictEqual(family.family, true);

      // Both should have matching member and lab dates
      assert.ok(
        datesWithinSeconds(family.member, primary.member),
        'family.member should match primary.member'
      );
      assert.ok(
        datesWithinSeconds(family.lab, primary.lab),
        'family.lab should match primary.lab'
      );
    });

    it('DENORM-008: Non-family payment does not update unrelated members', async function () {
      const primaryId = await createTestMember();
      const unrelatedId = await createTestMember({ name: 'Unrelated Member' });

      await processPayment(primaryId, 'memberBase', 300);

      const unrelated = await Members.findOneAsync(unrelatedId);

      // Unrelated member should not have been updated
      assert.ok(!unrelated.member, 'unrelated.member should not be set');
      assert.ok(!unrelated.family, 'unrelated.family should not be set');
    });

    it('DENORM-009: Regular payment does not update family members (only family payments do)', async function () {
      const primaryId = await createTestMember();
      const familyId = await createFamilyMember(primaryId);

      // Pay with regular (non-family) payment
      await processPayment(primaryId, 'memberBase', 300);

      const primary = await Members.findOneAsync(primaryId);
      const family = await Members.findOneAsync(familyId);

      // Primary should be updated
      assert.ok(primary.member, 'primary.member should be set');
      assert.strictEqual(primary.family, false);

      // Family member should NOT be updated (because memberBase is not a family payment)
      assert.ok(!family.member, 'family.member should not be set for non-family payment');
    });
  });
});
