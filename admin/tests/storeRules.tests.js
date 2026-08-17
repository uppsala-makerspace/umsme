import assert from 'assert';
import {
  hasFixedPrice,
  amountFor,
  commentFor,
  canBuy,
  swishMessageFor,
} from '/imports/common/lib/storeRules';

const TSHIRT = {
  code: 'tshirt',
  price: 150,
  status: 'available',
  requiresMembership: false,
};
const CLAY = {
  code: 'lera',
  status: 'available',
  requiresMembership: true,
  minPrice: 20,
  maxPrice: 500,
};
const DONATION = { code: 'gava', status: 'available', requiresMembership: false };
const COURSE = {
  code: 'kurs',
  price: 300,
  status: 'available',
  requiresMembership: true,
  commentRequired: true,
};

describe('storeRules', function () {
  describe('hasFixedPrice', function () {
    it('is the presence of a price, so the two cannot contradict', function () {
      assert.strictEqual(hasFixedPrice(TSHIRT), true);
      assert.strictEqual(hasFixedPrice(CLAY), false);
      assert.strictEqual(hasFixedPrice(DONATION), false);
    });

    it('treats a zero price as fixed, not as buyer-set', function () {
      assert.strictEqual(hasFixedPrice({ price: 0 }), true);
    });
  });

  describe('amountFor', function () {
    it('ignores what the client sent when the price is fixed', function () {
      assert.deepStrictEqual(amountFor(TSHIRT, 1), { amount: 150 });
      assert.deepStrictEqual(amountFor(TSHIRT, 99999), { amount: 150 });
      assert.deepStrictEqual(amountFor(TSHIRT, undefined), { amount: 150 });
    });

    it('takes the buyer amount when there is no price', function () {
      assert.deepStrictEqual(amountFor(CLAY, 120), { amount: 120 });
      assert.deepStrictEqual(amountFor(CLAY, '120'), { amount: 120 });
    });

    it('requires an amount when there is no price', function () {
      assert.deepStrictEqual(amountFor(CLAY, undefined), { error: 'amount-required' });
      assert.deepStrictEqual(amountFor(CLAY, ''), { error: 'amount-required' });
      assert.deepStrictEqual(amountFor(CLAY, 0), { error: 'amount-required' });
      assert.deepStrictEqual(amountFor(CLAY, -5), { error: 'amount-required' });
      assert.deepStrictEqual(amountFor(CLAY, 'gratis'), { error: 'amount-required' });
    });

    it('refuses fractional kronor', function () {
      assert.deepStrictEqual(amountFor(CLAY, 120.5), { error: 'amount-not-whole' });
    });

    it('holds the buyer to the item’s bounds', function () {
      assert.deepStrictEqual(amountFor(CLAY, 19), { error: 'amount-too-low' });
      assert.deepStrictEqual(amountFor(CLAY, 20), { amount: 20 });
      assert.deepStrictEqual(amountFor(CLAY, 500), { amount: 500 });
      assert.deepStrictEqual(amountFor(CLAY, 501), { error: 'amount-too-high' });
    });

    it('accepts any whole amount when the item sets no bounds', function () {
      assert.deepStrictEqual(amountFor(DONATION, 1), { amount: 1 });
      assert.deepStrictEqual(amountFor(DONATION, 100000), { amount: 100000 });
    });

    it('refuses a missing item', function () {
      assert.deepStrictEqual(amountFor(null, 100), { error: 'no-such-item' });
    });
  });

  describe('commentFor', function () {
    it('requires a comment when the item does', function () {
      assert.deepStrictEqual(commentFor(COURSE, ''), { error: 'comment-required' });
      assert.deepStrictEqual(commentFor(COURSE, '   '), { error: 'comment-required' });
      assert.deepStrictEqual(commentFor(COURSE, undefined), { error: 'comment-required' });
    });

    it('trims, and reports nothing as null rather than empty string', function () {
      assert.deepStrictEqual(commentFor(COURSE, '  Anna  '), { comment: 'Anna' });
      assert.deepStrictEqual(commentFor(TSHIRT, ''), { comment: null });
      assert.deepStrictEqual(commentFor(TSHIRT, '  '), { comment: null });
    });

    it('keeps an optional comment when one is given', function () {
      assert.deepStrictEqual(commentFor(TSHIRT, 'storlek L'), { comment: 'storlek L' });
    });
  });

  describe('canBuy', function () {
    it('lets anyone buy an item that needs no membership', function () {
      assert.strictEqual(canBuy(TSHIRT, { hasMembership: false }), true);
    });

    it('holds back an item that needs membership', function () {
      assert.strictEqual(canBuy(CLAY, { hasMembership: false }), false);
      assert.strictEqual(canBuy(CLAY, { hasMembership: true }), true);
    });

    it('refuses a hidden item to everyone', function () {
      const hidden = { ...TSHIRT, status: 'hidden' };
      assert.strictEqual(canBuy(hidden, { hasMembership: true }), false);
    });

    it('refuses when nothing is passed', function () {
      assert.strictEqual(canBuy(null, { hasMembership: true }), false);
      assert.strictEqual(canBuy(CLAY), false);
    });
  });

  describe('swishMessageFor', function () {
    const member = { mid: 'M-1234', name: 'Anna Andersson' };

    it('puts the code first, so truncation eats the name and not the code', function () {
      assert.strictEqual(
        swishMessageFor(CLAY, member),
        'ws:lera mid:M-1234 Anna Andersson'
      );
    });

    it('uses ws:, never the memberships’ pt:', function () {
      const msg = swishMessageFor(TSHIRT, member);
      assert.ok(msg.startsWith('ws:'), msg);
      assert.ok(!/\bpt:/.test(msg), msg);
    });

    it('keeps the code intact at the 50-character Swish limit', function () {
      // The longest code the schema allows, and a long name.
      const longCode = { code: 'abcdefghijkl' };
      const longName = { mid: 'M-123456', name: 'Anna-Karin Söderström-Bergqvist' };
      const truncated = swishMessageFor(longCode, longName).substring(0, 50);
      assert.ok(truncated.startsWith('ws:abcdefghijkl '), truncated);
    });
  });
});
