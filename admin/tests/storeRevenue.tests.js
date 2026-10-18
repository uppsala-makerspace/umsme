import assert from 'assert';
import { summarizeRevenue, revenueYears, maySeeWorkshopRevenue } from '/imports/common/lib/storeRevenue';

const items = new Map([
  ['clay', { name: { sv: 'Lera', en: 'Clay' }, sharedWith: [] }],
  ['glaze', { name: { sv: 'Glasyr', en: 'Glaze' }, sharedWith: ['Måleri'] }],
]);

const payment = (id, date, storeItem, amount, extra = {}) => ({
  _id: id, date: new Date(date), storeItem, amount, type: 'swish',
  name: 'Buyer Name', mobile: '0701234567', member: 'm1', message: 'ws:LERA mid:12 Buyer', ...extra,
});

const payments = [
  payment('p1', '2026-03-01', 'clay', 300, { comment: 'Kurs 3' }),
  payment('p2', '2026-05-10', 'glaze', 120),
  payment('p3', '2025-11-20', 'clay', 200),
];

describe('store revenue', function () {
  it('lists the years with sales, newest first', function () {
    assert.deepStrictEqual(revenueYears(payments), [2026, 2025]);
  });

  it('totals one year, newest payment first', function () {
    const r = summarizeRevenue(payments, items, 2026);
    assert.strictEqual(r.total, 420);
    assert.strictEqual(r.count, 2);
    assert.deepStrictEqual(r.payments.map((p) => p._id), ['p2', 'p1']);
  });

  it('totals all years with no year given', function () {
    assert.strictEqual(summarizeRevenue(payments, items, null).total, 620);
  });

  it('sums per item and keeps who an item is shared with', function () {
    const r = summarizeRevenue(payments, items, null);
    const clay = r.items.find((i) => i._id === 'clay');
    const glaze = r.items.find((i) => i._id === 'glaze');
    assert.deepStrictEqual([clay.count, clay.total], [2, 500]);
    assert.deepStrictEqual(glaze.sharedWith, ['Måleri']);
  });

  it('keeps items without sales in the per-item list', function () {
    const r = summarizeRevenue(payments, items, 2024);
    assert.strictEqual(r.count, 0);
    assert.deepStrictEqual(r.items.map((i) => i.total), [0, 0]);
  });

  it('gives nothing that identifies the buyer', function () {
    const [p] = summarizeRevenue(payments, items, 2026).payments.filter((x) => x._id === 'p1');
    assert.deepStrictEqual(Object.keys(p).sort(), ['_id', 'amount', 'comment', 'date', 'itemId', 'itemName']);
    assert.strictEqual(p.comment, 'Kurs 3');
    assert.deepStrictEqual(p.itemName, { sv: 'Lera', en: 'Clay' });
  });

  describe('who sees it', function () {
    const may = (args) => maySeeWorkshopRevenue({
      groupType: 'steering', membershipState: null, isResponsible: false, hasRole: false, ...args,
    });

    it('lets active steering group members in', function () {
      assert.strictEqual(may({ membershipState: 'active' }), true);
      assert.strictEqual(may({ isResponsible: true }), true);
    });

    it('keeps out a pending request and non-members', function () {
      assert.strictEqual(may({ membershipState: 'pending' }), false);
      assert.strictEqual(may({}), false);
    });

    it('does not count membership of a group that is not a steering group', function () {
      assert.strictEqual(may({ groupType: 'function', membershipState: 'active', isResponsible: true }), false);
      assert.strictEqual(may({ groupType: null, membershipState: 'active' }), false);
    });

    it('lets admin, board and treasurer in regardless', function () {
      assert.strictEqual(may({ groupType: null, hasRole: true }), true);
    });
  });
});
