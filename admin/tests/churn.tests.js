import assert from 'assert';
import { yearlyChurn } from '/imports/stats/churn';

// Churn over the last year: of those who held a membership at the end of the
// month a year earlier, the share who hold none at the month's end nor
// renew within three months after it. The last three months are left out:
// their late renewals are not known yet.

const day = (y, m, d) => new Date(y, m - 1, d);
const ms = (mid, start, end, type = 'member') => ({ mid, type, start, memberend: end });

describe('yearly churn', function () {
  const now = day(2026, 6, 15);
  const memberships = [
    // Renews every year: never lost.
    ms('stays', day(2024, 1, 1), day(2025, 1, 1)), ms('stays', day(2025, 1, 1), day(2026, 1, 1)), ms('stays', day(2026, 1, 1), day(2027, 1, 1), 'labandmember'),
    // A year from 2024-01-01, then gone: lost from the month it ran out.
    ms('leaves', day(2024, 1, 1), day(2025, 1, 1)),
    // Runs out 2025-03-01 and renews 2025-05-01, two months late: not lost.
    ms('late', day(2024, 3, 1), day(2025, 3, 1)), ms('late', day(2025, 5, 1), day(2026, 5, 1)),
    // A lab-only membership is not a base one.
    ms('labonly', day(2024, 1, 1), day(2027, 1, 1), 'lab'),
  ];
  const churn = yearlyChurn(memberships, null, now);
  const at = (label) => {
    const i = churn.labels.indexOf(label);
    return { percent: churn.percent[i], lost: churn.lost[i], base: churn.base[i] };
  };

  it('starts a year after the first membership and ends three months back', function () {
    assert.strictEqual(churn.labels[0], '2025 - January');
    // 2026-02's end, 2026-03-01, plus three months is 2026-06-01: known by the 15th of June.
    assert.strictEqual(churn.labels.at(-1), '2026 - February');
  });

  it('counts who was a member a year ago and has not renewed, a late renewal not a loss', function () {
    // End of January 2025: a year earlier stays and leaves; leaves ran out 2025-01-01 and never came back.
    assert.deepStrictEqual(at('2025 - January'), { percent: 50, lost: 1, base: 2 });
    // End of March 2025: a year earlier stays, leaves and late; late is out but renews in May.
    assert.deepStrictEqual(at('2025 - March'), { percent: 33.3, lost: 1, base: 3 });
  });

  it('marks the Decembers, each a whole calendar year', function () {
    assert.strictEqual(churn.year[churn.labels.indexOf('2025 - December')], 2025);
    assert.strictEqual(churn.year[churn.labels.indexOf('2025 - November')], null);
  });

  it('leaves out the months before the period', function () {
    const recent = yearlyChurn(memberships, day(2025, 12, 1), now);
    assert.deepStrictEqual(recent.labels, ['2025 - December', '2026 - January', '2026 - February']);
  });
});
