import assert from "assert";
import { familyFromMemberships } from "/imports/common/lib/familyRules.js";

const d = (iso) => new Date(iso);
/** A membership as stored: only the two fields the rule reads. */
const ms = (memberend, family) => ({ memberend: memberend ? d(memberend) : undefined, family });

describe("familyRules", function () {
  describe("familyFromMemberships", function () {
    it("is false without memberships", function () {
      assert.strictEqual(familyFromMemberships([]), false);
    });

    it("follows a lone membership", function () {
      assert.strictEqual(familyFromMemberships([ms("2027-06-14", true)]), true);
      assert.strictEqual(familyFromMemberships([ms("2027-06-14", false)]), false);
    });

    it("ignores memberships that ended earlier", function () {
      // A family year followed by a single-member renewal: no longer family.
      const own = [ms("2025-04-14", true), ms("2027-04-24", false)];
      assert.strictEqual(familyFromMemberships(own), false);
    });

    it("keeps a family add-on that shares the base membership's end date", function () {
      // The 2026-08 incident: base 1200 kr on 2026-06-07 and an 800 kr family
      // add-on on 2026-08-19, both ending 2027-06-14.
      const own = [ms("2027-06-14", false), ms("2027-06-14", true)];
      assert.strictEqual(familyFromMemberships(own), true);
    });

    it("does not depend on document order", function () {
      const own = [ms("2027-06-14", false), ms("2027-06-14", true)];
      assert.strictEqual(
        familyFromMemberships(own),
        familyFromMemberships([...own].reverse()),
      );
      const three = [ms("2026-09-03", true), ms("2026-09-03", false), ms("2026-09-03", false)];
      assert.strictEqual(familyFromMemberships(three), true);
      assert.strictEqual(familyFromMemberships([...three].reverse()), true);
    });

    it("ignores a tie that is not at the latest end date", function () {
      // Family add-on in 2024, single-member renewal in 2026 — the renewal alone
      // is in play, so its false stands.
      const own = [ms("2025-01-27", false), ms("2025-01-27", true), ms("2027-05-11", false)];
      assert.strictEqual(familyFromMemberships(own), false);
    });

    it("ignores memberships without an end date", function () {
      // A bare quarterly lab carries no family status.
      assert.strictEqual(familyFromMemberships([ms(null, true)]), false);
      assert.strictEqual(
        familyFromMemberships([ms("2027-06-14", false), ms(null, true)]),
        false,
      );
    });

    it("treats a missing family field as not family", function () {
      assert.strictEqual(familyFromMemberships([{ memberend: d("2027-06-14") }]), false);
    });
  });
});
