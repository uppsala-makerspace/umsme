import { Meteor } from 'meteor/meteor';
import { Roles } from 'meteor/roles';
import { Expenses } from '/imports/common/collections/expenses';
import { ExpenseAccounts } from '/imports/common/collections/expenseAccounts';
import { Payments } from '/imports/common/collections/payments';
import { Members } from '/imports/common/collections/members';
import { parseBankFile, buildRemainingCsv } from '/imports/accounting/bankFile';
import { matchRows, invalidIncomeCode } from '/imports/accounting/match';
import { toVerifications, buildSie } from '/imports/accounting/sie';

const requireRole = async (roles) => {
  if (!Meteor.userId() || !(await Roles.userIsInRoleAsync(Meteor.userId(), roles))) {
    throw new Meteor.Error('not-authorized', 'Insufficient role');
  }
};

const sum = (xs) => Math.round(xs.reduce((a, x) => a + x * 100, 0)) / 100;

Meteor.methods({
  /**
   * Return the non-sensitive accounting config the admin UI needs: the allowed
   * dimensions (for tagging expense accounts) and the selectable bookkeeping
   * accounts (for reimbursing expenses). Settings aren't published to clients,
   * so this is a role-gated method mirroring the `fromOptions` pattern.
   */
  'accounting.config': async () => {
    if (
      !Meteor.userId() ||
      !(await Roles.userIsInRoleAsync(Meteor.userId(), ['admin', 'board', 'treasurer']))
    ) {
      throw new Meteor.Error('not-authorized', 'Insufficient role');
    }
    const a = Meteor.settings.accounting || {};
    return {
      dimensions: Array.isArray(a.dimensions) ? a.dimensions : [],
      expense: { accountOptions: a.expense?.accountOptions || [] },
    };
  },

  /**
   * Stateless bank-statement processing: parse an uploaded Swedbank CSV,
   * match rows against reimbursed expenses / member Swish payments / standard
   * income codes, and return a SIE 4i file (CP437) with the recognized rows
   * plus a remaining CSV (original format/encoding) with everything else.
   * Reads the database, writes nothing.
   */
  'accounting.processBankFile': async (fileBase64) => {
    await requireRole(['treasurer', 'admin']);
    const config = Meteor.settings.accounting;
    if (!config?.company?.orgNo || !config?.bankAccount) {
      throw new Meteor.Error('no-config', 'settings.accounting must define company.orgNo and bankAccount');
    }
    const badCode = invalidIncomeCode(config.standardIncome?.codes);
    if (badCode !== null) {
      throw new Meteor.Error('bad-config',
        `Each entry in accounting.standardIncome.codes must be an object like ` +
        `{ "code": "LERA", "account": "3010", "dimension": { "6": "VERK" } } — got: ${JSON.stringify(badCode)}`);
    }

    let parsed;
    try {
      parsed = parseBankFile(Buffer.from(String(fileBase64), 'base64'));
    } catch (e) {
      throw new Meteor.Error('bad-file', `Could not parse bank file: ${e.message}`);
    }
    if (!parsed.rows.length) {
      throw new Meteor.Error('empty-file', 'The bank file contains no transaction rows');
    }

    const window = config.matchWindowDays ?? 5;
    const dates = parsed.rows.map((r) => r.transdag).filter(Boolean);
    const from = new Date(Math.min(...dates) - window * 86400000);
    const to = new Date(Math.max(...dates) + (window + 1) * 86400000);

    // Include reimbursed expenses without reimbursedDate (reimbursed before
    // phase 1) — they can't match, but the diagnostics must be able to name them.
    const expenses = await Expenses.find({
      status: 'reimbursed',
      $or: [
        { reimbursedDate: { $gte: from, $lte: to } },
        { reimbursedDate: { $exists: false } },
      ],
    }).fetchAsync();
    // Both payment sources are evidence: Swish-callback payments (automatic
    // Swish number; the bank sync deliberately skips those) and bank-synced
    // payments (hash set, manual Swish number, manually linked to members).
    // The sources cover disjoint transactions, so no twins arise.
    const payments = await Payments.find({
      type: 'swish',
      date: { $gte: from, $lte: to },
    }).fetchAsync();

    const { matches, remaining, flags, diagnostics } = matchRows(parsed.rows, {
      expenses,
      payments,
      config: {
        matchWindowDays: window,
        standardIncomeCodes: config.standardIncome?.codes || [],
      },
    });

    const memberIds = [
      ...new Set(matches.flatMap((m) => [m.expense?.memberId, m.payment?.member]).filter(Boolean)),
    ];
    const memberNameById = {};
    for (const m of await Members.find({ _id: { $in: memberIds } }).fetchAsync()) {
      memberNameById[m._id] = m.name;
    }
    const expenseAccountsById = {};
    for (const a of await ExpenseAccounts.find().fetchAsync()) {
      expenseAccountsById[a._id] = a;
    }

    const dimensionNames = {};
    for (const d of config.dimensions || []) dimensionNames[String(d.nr)] = d.name;
    const verifications = toVerifications(matches, { config, expenseAccountsById, memberNameById });
    const sieBuffer = buildSie(verifications, { company: config.company, dimensionNames }, new Date());
    const remainingBuffer = buildRemainingCsv(parsed, remaining);

    // Control identity: Σ(all rows) == Σ(SIE bank legs) == Σ(matched) + Σ(remaining).
    const total = sum(parsed.rows.map((r) => r.belopp));
    const bankLegs = sum(verifications.flatMap((v) =>
      v.trans.filter((t) => t.account === config.bankAccount).map((t) => t.amount)));
    const remainingSum = sum(remaining.map((r) => r.belopp));

    const byKind = (kind) => matches.filter((m) => m.kind === kind);
    const kindSummary = (kind) => ({
      count: byKind(kind).length,
      sum: sum(byKind(kind).map((m) => m.row.belopp)),
    });

    const fmt = (d) => `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
    return {
      summary: {
        totalRows: parsed.rows.length,
        totalSum: total,
        expenses: kindSummary('U'),
        memberPayments: kindSummary('M'),
        standardIncome: kindSummary('S'),
        remaining: { count: remaining.length, sum: remainingSum },
        control: {
          bankLegs,
          remainingSum,
          holds: Math.round(total * 100) === Math.round((bankLegs + remainingSum) * 100),
        },
        // Candidate pools — the first thing to look at when nothing matches.
        pools: {
          reimbursedExpenses: expenses.length,
          expensesMissingReimbursedDate: expenses.filter((e) => !e.reimbursedDate).length,
          expensesMissingAccount: expenses.filter((e) => !e.bookkeepingAccount).length,
          callbackPayments: payments.filter((p) => !p.hash).length,
          bankImportPayments: payments.filter((p) => p.hash).length,
        },
      },
      flags,
      diagnostics,
      sieBase64: sieBuffer.toString('base64'),
      remainingCsvBase64: remainingBuffer.toString('base64'),
      suggestedNames: {
        sie: `sie-${fmt(new Date(Math.min(...dates)))}-${fmt(new Date(Math.max(...dates)))}.se`,
        remaining: 'kvarvarande.csv',
      },
    };
  },
});
