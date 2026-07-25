import assert from 'assert';
import {
  buildSeries,
  categoryAt,
  countsAt,
  sortAndAccumulate,
} from '/imports/stats/membershipSeries';

const d = (iso) => new Date(iso);

/** A membership document, with only the fields the series building reads. */
const ms = (mid, type, start, memberend, extra = {}) => ({
  _id: `${mid}-${start}`,
  mid,
  type,
  start: d(start),
  memberend: memberend ? d(memberend) : undefined,
  ...extra,
});

/**
 * Accumulate a series without the "drop the future" filter that
 * sortAndAccumulate applies, so fixtures can use fixed dates far from today.
 */
const totalAt = (events, when) =>
  events
    .filter((e) => e.when <= when)
    .reduce((sum, e) => sum + e.value, 0);

describe('Membership statistics series', function () {
  describe('overlapping memberships (the double counting bug)', function () {
    // The upgrade case: a base membership running to 2027-01-01 and a lab
    // membership bought mid-period that runs to 2027-08-01.
    const memberships = [
      ms('m1', 'member', '2026-01-01', '2027-01-01'),
      ms('m1', 'labandmember', '2026-06-01', '2027-08-01', { labend: d('2027-08-01') }),
    ];

    it('counts the member once during the overlap, never twice', function () {
      const { memberEvents } = buildSeries(memberships);
      // Through the whole overlap (2026-06-01 .. 2027-01-01) it must stay 1.
      ['2026-06-01', '2026-09-01', '2026-12-31'].forEach((when) => {
        assert.strictEqual(totalAt(memberEvents, d(when)), 1, `total at ${when}`);
      });
    });

    it('still counts the member after the replaced membership ends', function () {
      const { memberEvents } = buildSeries(memberships);
      assert.strictEqual(totalAt(memberEvents, d('2027-03-01')), 1);
    });

    it('drops to zero only when all coverage has ended', function () {
      const { memberEvents } = buildSeries(memberships);
      assert.strictEqual(totalAt(memberEvents, d('2027-08-02')), 0);
    });

    it('moves the member from individual to individualLab on the upgrade date', function () {
      assert.strictEqual(categoryAt(memberships, d('2026-03-01')), 'individual');
      assert.strictEqual(categoryAt(memberships, d('2026-06-01')), 'individualLab');
      assert.strictEqual(categoryAt(memberships, d('2026-12-31')), 'individualLab');
    });
  });

  describe('renewals and gaps', function () {
    it('stays at one across a back-to-back renewal', function () {
      const memberships = [
        ms('m1', 'member', '2025-01-01', '2026-01-01'),
        ms('m1', 'member', '2026-01-01', '2027-01-01'),
      ];
      const { memberEvents } = buildSeries(memberships);
      ['2025-06-01', '2026-01-01', '2026-06-01'].forEach((when) => {
        assert.strictEqual(totalAt(memberEvents, d(when)), 1, `total at ${when}`);
      });
    });

    it('goes 1 -> 0 -> 1 across a real gap', function () {
      const memberships = [
        ms('m1', 'member', '2024-01-01', '2025-01-01'),
        ms('m1', 'member', '2026-01-01', '2027-01-01'),
      ];
      const { memberEvents } = buildSeries(memberships);
      assert.strictEqual(totalAt(memberEvents, d('2024-06-01')), 1);
      assert.strictEqual(totalAt(memberEvents, d('2025-06-01')), 0, 'during the gap');
      assert.strictEqual(totalAt(memberEvents, d('2026-06-01')), 1);
    });
  });

  describe('category exclusivity', function () {
    const memberships = [
      // Plain base member
      ms('m1', 'member', '2026-01-01', '2027-01-01'),
      // Base member who upgrades to lab mid-period (overlap)
      ms('m2', 'member', '2026-01-01', '2027-01-01'),
      ms('m2', 'labandmember', '2026-06-01', '2027-08-01', { labend: d('2027-08-01') }),
      // Base member with a separate quarterly lab document
      ms('m3', 'member', '2026-01-01', '2027-01-01'),
      ms('m3', 'lab', '2026-03-01', '2027-01-01', { labend: d('2026-06-01') }),
      // Family lab member
      ms('m4', 'labandmember', '2026-01-01', '2027-01-01', {
        labend: d('2027-01-01'),
        family: true,
      }),
    ];

    it('has categories summing exactly to the total at every boundary', function () {
      [
        '2026-01-01', '2026-03-01', '2026-06-01', '2026-09-01',
        '2027-01-01', '2027-08-01',
      ].forEach((when) => {
        const c = countsAt(memberships, d(when));
        const sum = c.individual + c.individualLab + c.family + c.familyLab;
        assert.strictEqual(sum, c.total, `categories should sum to total at ${when}`);
      });
    });

    it('counts a quarterly lab holder as lab, not as no-lab', function () {
      // Quarterly lab active
      assert.strictEqual(categoryAt(
        memberships.filter((m) => m.mid === 'm3'), d('2026-04-01')
      ), 'individualLab');
      // ...and back to plain membership once the quarter has run out
      assert.strictEqual(categoryAt(
        memberships.filter((m) => m.mid === 'm3'), d('2026-07-01')
      ), 'individual');
    });

    it('keeps family and non-family in separate categories', function () {
      const c = countsAt(memberships, d('2026-09-01'));
      assert.strictEqual(c.total, 4);
      assert.strictEqual(c.familyLab, 1, 'm4');
      assert.strictEqual(c.individualLab, 1, 'm2 (upgraded)');
      assert.strictEqual(c.individual, 2, 'm1 and m3 (quarter expired)');
      assert.strictEqual(c.family, 0);
    });
  });

  describe('family upgrade keeping the same end date (S3d)', function () {
    // Paying only the difference produces a new membership with the same dates.
    const memberships = [
      ms('m1', 'labandmember', '2026-01-01', '2027-01-01', { labend: d('2027-01-01') }),
      ms('m1', 'labandmember', '2026-06-01', '2027-01-01', {
        labend: d('2027-01-01'),
        family: true,
      }),
    ];

    it('counts the member once, not twice', function () {
      const { memberEvents } = buildSeries(memberships);
      assert.strictEqual(totalAt(memberEvents, d('2026-09-01')), 1);
      assert.strictEqual(countsAt(memberships, d('2026-09-01')).total, 1);
    });

    it('switches the category from individualLab to familyLab', function () {
      assert.strictEqual(categoryAt(memberships, d('2026-03-01')), 'individualLab');
      assert.strictEqual(categoryAt(memberships, d('2026-09-01')), 'familyLab');
    });
  });

  describe('members without memberships', function () {
    it('ignores a member whose only document is a quarterly lab', function () {
      // Lab access alone never establishes membership presence.
      const memberships = [
        ms('m1', 'lab', '2026-01-01', undefined, { labend: d('2026-04-01') }),
      ];
      assert.strictEqual(countsAt(memberships, d('2026-02-01')).total, 0);
      assert.strictEqual(buildSeries(memberships).memberEvents.length, 0);
    });

    it('returns empty series for no memberships at all', function () {
      const series = buildSeries([]);
      assert.deepStrictEqual(series.memberEvents, []);
      assert.strictEqual(countsAt([], new Date()).total, 0);
    });
  });

  describe('sortAndAccumulate', function () {
    it('merges same-day events so a renewal does not dip', function () {
      const events = [
        { value: 1, when: d('2020-01-01') },
        { value: -1, when: d('2021-01-01') },
        { value: 1, when: d('2021-01-01') },
      ];
      const points = sortAndAccumulate(events, null, new Date());
      assert.deepStrictEqual(points.map((p) => p.y), [1, 1]);
    });

    it('drops events in the future', function () {
      const future = new Date(Date.now() + 1000 * 3600 * 24 * 30);
      const points = sortAndAccumulate(
        [{ value: 1, when: d('2020-01-01') }, { value: -1, when: future }],
        null,
        new Date(Date.now() + 1000 * 3600 * 24 * 365)
      );
      assert.strictEqual(points[points.length - 1].y, 1, 'still a member today');
    });

    it('does not mutate the input array', function () {
      const events = [
        { value: 1, when: d('2020-02-01') },
        { value: 1, when: d('2020-01-01') },
      ];
      const copy = [...events];
      sortAndAccumulate(events, null, new Date());
      assert.deepStrictEqual(events, copy, 'input order preserved');
    });
  });
});
