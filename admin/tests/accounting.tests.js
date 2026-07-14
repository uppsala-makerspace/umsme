import assert from 'assert';
import iconv from 'iconv-lite';
import { parseBankFile, buildRemainingCsv, splitCsvLine } from '/imports/accounting/bankFile';
import { matchRows, normalizePhone, findIncomeCode, invalidIncomeCode } from '/imports/accounting/match';
import { toVerifications, buildSie } from '/imports/accounting/sie';

// A small CP1252 fixture mirroring the Swedbank format (see
// redovisningsstöd/Transaktioner.csv): comment line, column header, then rows.
const FIXTURE = [
  '* Transaktionsrapport Period 2026-05-22 – 2026-06-21',
  'Radnr,Clnr,Kontonr,Produkt,Valuta,Bokfdag,Transdag,Valutadag,Referens,Text,Belopp,Saldo',
  '1,00000,9999999999,"Företagskonto",SEK,2026-06-22,2026-06-21,2026-06-22,"1111111111","Swish +46700000001",350.00,393752.52',
  '2,00000,9999999999,"Företagskonto",SEK,2026-06-18,2026-06-18,2026-06-22,"2222222222","Swish +46700000002",450.00,393402.52',
  '3,00000,9999999999,"Företagskonto",SEK,2026-06-01,2026-06-01,2026-06-01,"Ers. lödspetsar","Överföring via internet",-2570.81,362732.75',
  '4,00000,9999999999,"Företagskonto",SEK,2026-05-25,2026-05-25,2026-05-25,"Hyra Juni","Pg-bet. via internet",-74000.00,369551.25',
  '5,00000,9999999999,"Företagskonto",SEK,2026-06-10,2026-06-10,2026-06-10,"3333333333","Swish +46700000003",200.00,369751.25',
].join('\r\n') + '\r\n';

const fixtureBuffer = () => iconv.encode(FIXTURE, 'win1252');

const CONFIG = {
  matchWindowDays: 5,
  standardIncomeCodes: [{ code: 'LERA', account: '3010', dimension: { 6: 'VERK' } }],
};

const ACCOUNTING = {
  company: { orgNo: '000000-0000', name: 'Föreningen' },
  bankAccount: '1930',
  expense: { series: 'U' },
  memberPayment: { series: 'M', account: '3110', dimension: { 1: 'MEDLEM' } },
  standardIncome: { series: 'S' },
};

if (Meteor.isServer) {
  describe('accounting/bankFile', function () {
    it('splits quoted CSV fields', function () {
      assert.deepStrictEqual(splitCsvLine('1,"a,b","c""d",2'), ['1', 'a,b', 'c"d', '2']);
    });

    it('parses the Swedbank format with CP1252 characters intact', function () {
      const parsed = parseBankFile(fixtureBuffer());
      assert.strictEqual(parsed.rows.length, 5);
      assert.strictEqual(parsed.rows[2].referens, 'Ers. lödspetsar');
      assert.strictEqual(parsed.rows[2].belopp, -2570.81);
      assert.strictEqual(parsed.rows[0].transdag.getDate(), 21);
      assert.strictEqual(parsed.headerLines.length, 2);
    });

    it('rebuilds a byte-identical CSV when nothing matched', function () {
      const parsed = parseBankFile(fixtureBuffer());
      const rebuilt = buildRemainingCsv(parsed, parsed.rows);
      assert.ok(fixtureBuffer().equals(rebuilt));
    });

    it('rejects files without the expected header', function () {
      assert.throws(() => parseBankFile(iconv.encode('foo,bar\n1,2\n', 'win1252')));
    });
  });

  describe('accounting/match', function () {
    it('normalizes Swedish phone formats to a comparable form', function () {
      assert.strictEqual(normalizePhone('Swish +46700000001'), normalizePhone('46700000001'));
      assert.strictEqual(normalizePhone('+46 70 000 00 01'), normalizePhone('0700000001'));
    });

    it('rejects malformed standardIncome.codes entries (plain strings, missing account)', function () {
      assert.strictEqual(invalidIncomeCode([{ code: 'LERA', account: '3010' }]), null);
      assert.strictEqual(invalidIncomeCode([]), null);
      assert.strictEqual(invalidIncomeCode(undefined), null);
      assert.strictEqual(invalidIncomeCode(['Material keramik']), 'Material keramik');
      assert.deepStrictEqual(invalidIncomeCode([{ code: 'LERA' }]), { code: 'LERA' });
    });

    it('finds income codes as words or pt: codes, not substrings', function () {
      const codes = CONFIG.standardIncomeCodes;
      assert.ok(findIncomeCode('LERA vt26', codes));
      assert.ok(findIncomeCode('pt:LERA mid:1 X', codes));
      assert.strictEqual(findIncomeCode('GALLERAN', codes), null);
    });

    it('matches expenses, member payments, and standard income 1:1', function () {
      const parsed = parseBankFile(fixtureBuffer());
      const expenses = [
        { _id: 'e1', amount: 2570.81, bookkeepingAccount: '5460', reimbursedDate: new Date(2026, 5, 1), expenseAccountId: 'ea1', memberId: 'm1', driveFileId: 'df1' },
      ];
      const payments = [
        { _id: 'p1', mobile: '46700000001', amount: 350, date: new Date(2026, 5, 21, 14, 30), member: 'm2', initiatedBy: 'i1', message: 'pt:memberBase mid:7 Alice' },
        { _id: 'p2', mobile: '+46 70 000 00 02', amount: 450, date: new Date(2026, 5, 18), message: 'LERA vt26' },
      ];
      const { matches, remaining, flags } = matchRows(parsed.rows, { expenses, payments, config: CONFIG });
      assert.deepStrictEqual(matches.map((m) => m.kind).sort(), ['M', 'S', 'U']);
      // Remaining: the Pg row and the Swish row without any payment.
      assert.strictEqual(remaining.length, 2);
      assert.deepStrictEqual(remaining.map((r) => r.rowNr), ['4', '5']);
      assert.strictEqual(flags.length, 0);
    });

    it('flags ambiguity and missing bookkeeping account instead of matching', function () {
      const parsed = parseBankFile(fixtureBuffer());
      const expenses = [
        { _id: 'e1', amount: 2570.81, bookkeepingAccount: '5460', reimbursedDate: new Date(2026, 5, 1) },
        { _id: 'e2', amount: 2570.81, bookkeepingAccount: '6110', reimbursedDate: new Date(2026, 5, 2) },
        { _id: 'e3', amount: 74000, reimbursedDate: new Date(2026, 4, 25) }, // no account chosen
      ];
      const { matches, remaining, flags } = matchRows(parsed.rows, { expenses, payments: [], config: CONFIG });
      assert.strictEqual(matches.length, 0);
      assert.strictEqual(remaining.length, 5);
      assert.deepStrictEqual(flags.map((f) => f.reason).sort(),
        ['ambiguous-expense', 'expense-missing-account']);
    });

    it('accepts bank-synced payments linked to a membership as member payments', function () {
      const parsed = parseBankFile(fixtureBuffer());
      const payments = [
        { _id: 'p1', hash: 'abc', mobile: '+46700000001', amount: 350, date: new Date(2026, 5, 21), member: 'm2', membership: 'ms1', message: 'medlemsavgift' },
      ];
      const { matches } = matchRows(parsed.rows, { expenses: [], payments, config: CONFIG });
      assert.strictEqual(matches.length, 1);
      assert.strictEqual(matches[0].kind, 'M');
    });

    it('accepts bank-synced payments with an income code as standard income', function () {
      const parsed = parseBankFile(fixtureBuffer());
      const payments = [
        { _id: 'p1', hash: 'abc', mobile: '46700000002', amount: 450, date: new Date(2026, 5, 18), message: 'LERA' },
      ];
      const { matches } = matchRows(parsed.rows, { expenses: [], payments, config: CONFIG });
      assert.strictEqual(matches.length, 1);
      assert.strictEqual(matches[0].kind, 'S');
    });

    it('leaves unenriched bank-synced payments unmatched with an actionable diagnosis', function () {
      const parsed = parseBankFile(fixtureBuffer());
      const payments = [
        { _id: 'p1', hash: 'abc', mobile: '46700000001', amount: 350, date: new Date(2026, 5, 21), message: 'hej' },
      ];
      const { matches, flags, diagnostics } = matchRows(parsed.rows, { expenses: [], payments, config: CONFIG });
      assert.strictEqual(matches.length, 0);
      assert.ok(flags.some((f) => f.reason === 'unclassified-payment'));
      const d = diagnostics.find((x) => x.rowNr === '1');
      assert.ok(d && /Payments view/.test(d.why));
    });

    it('explains near misses for expenses without phase 1 fields', function () {
      const parsed = parseBankFile(fixtureBuffer());
      const expenses = [
        { _id: 'e1', amount: 2570.81 }, // reimbursed pre phase 1: no date, no account
      ];
      const { matches, diagnostics } = matchRows(parsed.rows, { expenses, payments: [], config: CONFIG });
      assert.strictEqual(matches.length, 0);
      const d = diagnostics.find((x) => x.rowNr === '3');
      assert.ok(d && /no reimbursedDate/.test(d.why));
    });

    it('matches interchangeable candidates (same person, same code, several purchases)', function () {
      const parsed = parseBankFile(fixtureBuffer());
      // Two clay purchases from the same number fit row 1 (350 kr, 2026-06-21);
      // a duplicated bank row consumes the second one.
      const rows = [parsed.rows[0], { ...parsed.rows[0], rowNr: '9' }];
      const payments = [
        { _id: 'p1', mobile: '46700000001', amount: 350, date: new Date(2026, 5, 21), message: 'LERA' },
        { _id: 'p2', mobile: '46700000001', amount: 350, date: new Date(2026, 5, 20), message: 'lera igen' },
      ];
      const { matches, remaining, flags } = matchRows(rows, { expenses: [], payments, config: CONFIG });
      assert.strictEqual(matches.length, 2);
      assert.ok(matches.every((m) => m.kind === 'S'));
      // Closest date consumed first.
      assert.strictEqual(matches[0].payment._id, 'p1');
      assert.strictEqual(matches[1].payment._id, 'p2');
      assert.strictEqual(remaining.length, 0);
      assert.strictEqual(flags.length, 0);
    });

    it('leaves conflicting classifications unmatched with a flag', function () {
      const parsed = parseBankFile(fixtureBuffer());
      const payments = [
        { _id: 'p1', mobile: '46700000001', amount: 350, date: new Date(2026, 5, 21), message: 'LERA' },
        { _id: 'p2', mobile: '46700000001', amount: 350, date: new Date(2026, 5, 21), member: 'm2', membership: 'ms1' },
      ];
      const { matches, remaining, flags } = matchRows([parsed.rows[0]], { expenses: [], payments, config: CONFIG });
      assert.strictEqual(matches.length, 0);
      assert.strictEqual(remaining.length, 1);
      assert.strictEqual(flags.length, 1);
      assert.strictEqual(flags[0].reason, 'ambiguous-payment');
      assert.ok(/conflicting classifications/.test(flags[0].detail));
    });

    it('consumes each payment at most once', function () {
      const parsed = parseBankFile(fixtureBuffer());
      // Two bank rows would both match this single payment (same phone/amount
      // impossible here, so simulate with duplicate rows).
      const rows = [parsed.rows[0], { ...parsed.rows[0], rowNr: '9' }];
      const payments = [
        { _id: 'p1', mobile: '46700000001', amount: 350, date: new Date(2026, 5, 21), member: 'm2', initiatedBy: 'i1', message: 'pt:memberBase mid:7 Alice' },
      ];
      const { matches, remaining } = matchRows(rows, { expenses: [], payments, config: CONFIG });
      assert.strictEqual(matches.length, 1);
      assert.strictEqual(remaining.length, 1);
    });
  });

  describe('accounting/sie', function () {
    const build = () => {
      const parsed = parseBankFile(fixtureBuffer());
      const expenses = [
        { _id: 'e1', amount: 2570.81, bookkeepingAccount: '5460', reimbursedDate: new Date(2026, 5, 1), expenseAccountId: 'ea1', memberId: 'm1', driveFileId: 'df1' },
      ];
      const payments = [
        { _id: 'p1', mobile: '46700000001', amount: 350, date: new Date(2026, 5, 21), member: 'm2', initiatedBy: 'i1', message: 'pt:memberBase mid:7 Alice' },
        { _id: 'p2', mobile: '46700000002', amount: 450, date: new Date(2026, 5, 18), message: 'LERA vt26' },
      ];
      const { matches } = matchRows(parsed.rows, { expenses, payments, config: CONFIG });
      const vers = toVerifications(matches, {
        config: ACCOUNTING,
        expenseAccountsById: { ea1: { name: 'Verktyg', dimensions: { 1: 'VERKSTAD' } } },
        memberNameById: { m1: 'Bob Böös', m2: 'Alice Åberg' },
      });
      return { vers, sie: iconv.decode(buildSie(vers, { company: ACCOUNTING.company, dimensionNames: { 1: 'Kostnadsställe', 6: 'Projekt' } }, new Date(2026, 6, 14)), 'cp437') };
    };

    it('every verification balances to zero', function () {
      const { vers } = build();
      for (const v of vers) {
        const sum = v.trans.reduce((a, t) => a + Math.round(t.amount * 100), 0);
        assert.strictEqual(sum, 0, v.text);
      }
    });

    it('produces a valid SIE 4i structure with empty verification numbers', function () {
      const { sie } = build();
      assert.ok(sie.includes('#FLAGGA 0'));
      assert.ok(sie.includes('#FORMAT PC8'));
      assert.ok(sie.includes('#SIETYP 4'));
      assert.ok(sie.includes('#ORGNR 000000-0000'));
      assert.ok(/#VER "U" "" 20260601 /.test(sie));
      assert.ok(/#VER "M" "" 20260621 /.test(sie));
      assert.ok(/#VER "S" "" 20260618 /.test(sie));
      // Dimensions/objects declared and applied.
      assert.ok(sie.includes('#DIM 1 "Kostnadsställe"'));
      assert.ok(sie.includes('#OBJEKT 1 "VERKSTAD" "VERKSTAD"'));
      assert.ok(sie.includes('#TRANS 3110 {1 "MEDLEM"} -350.00'));
      assert.ok(sie.includes('#TRANS 5460 {1 "VERKSTAD"} 2570.81'));
      assert.ok(sie.includes('#TRANS 1930 {} -2570.81'));
    });

    it('survives CP437 round-trip for Swedish characters', function () {
      const { sie } = build();
      assert.ok(sie.includes('Böös'));
      assert.ok(sie.includes('Åberg'));
    });

    it('rejects unbalanced verifications', function () {
      assert.throws(() => buildSie(
        [{ series: 'U', date: new Date(), text: 'bad', trans: [{ account: '1930', dimension: null, amount: 100 }] }],
        { company: ACCOUNTING.company, dimensionNames: {} },
        new Date()
      ));
    });
  });
}
