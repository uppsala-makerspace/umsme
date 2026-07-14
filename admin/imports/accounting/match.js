// Pure 1:1 matching of bank-statement rows against UMSME data (statelessly —
// the caller fetches candidates; nothing is written anywhere).
//
// Order per row (see redovisningsstöd/implementation-fas2-import-export.md):
//   a) outgoing (belopp < 0)  → reimbursed expense with a bookkeepingAccount
//   b/c) incoming Swish       → payment by phone+amount+date, classified as
//        standard income (configured code in the message) or member payment
//        (app-initiated: initiatedBy + member + pt: code)
//   d) everything else        → remaining CSV
// Conservative rules: 0 candidates → remaining; >1 → remaining + flag; every
// DB document is consumed at most once.

const DAY_MS = 24 * 60 * 60 * 1000;

// Compare on whole calendar days so a date-only Transdag matches a timestamped
// DB date within ±windowDays.
const dayDiff = (a, b) => {
  const da = new Date(a.getFullYear(), a.getMonth(), a.getDate());
  const db = new Date(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.abs(Math.round((da - db) / DAY_MS));
};

// Amount equality in öre (avoids float noise).
const sameAmount = (a, b) => Math.round(a * 100) === Math.round(b * 100);

// Swedish phone comparison: strip non-digits and compare the last 9 digits,
// which unifies 46701234567 / +46 70 123 45 67 / 0701234567.
export const normalizePhone = (s) => {
  const digits = String(s || '').replace(/\D/g, '');
  return digits.slice(-9);
};

const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Validate the hand-edited settings.accounting.standardIncome.codes array.
// Returns null when valid, otherwise the first malformed entry.
export const invalidIncomeCode = (codes) =>
  (codes || []).find((c) =>
    typeof c !== 'object' || c === null ||
    typeof c.code !== 'string' || !c.code.trim() ||
    typeof c.account !== 'string' || !c.account.trim()
  ) ?? null;

// A standard-income code matches if it appears in the payment message as a
// whole word (case-insensitive) or as an app-initiated pt:<code>. Transitional
// heuristic per spec — hence the separate S series for clean re-import.
export const findIncomeCode = (message, codes) => {
  const msg = String(message || '');
  return (codes || []).find((c) =>
    new RegExp(`(^|[^\\wåäöÅÄÖ])${escapeRegExp(c.code)}($|[^\\wåäöÅÄÖ])`, 'i').test(msg) ||
    new RegExp(`\\bpt:${escapeRegExp(c.code)}\\b`, 'i').test(msg)
  ) || null;
};

// A payment counts as a member payment when we positively know what it was:
// either app-initiated (callback carries member + a pt: code), or a bank-synced
// payment the admin manually linked to a membership in the Payments view (the
// membership link is what proves it wasn't clay/course/other income).
const isMemberPayment = (payment) =>
  !!(payment.initiatedBy && payment.member && /\bpt:/.test(payment.message || '')) ||
  !!(payment.member && payment.membership);

/**
 * @param rows       parsed bank rows (from parseBankFile)
 * @param expenses   Expense docs with status 'reimbursed' (with or without
 *                   bookkeepingAccount/reimbursedDate — incomplete ones only
 *                   produce warnings/diagnostics)
 * @param payments   settled Payment docs — both Swish-callback payments (the
 *                   automatic Swish number; bank sync excludes those) and
 *                   bank-synced payments (hash set, the manual Swish number).
 *                   The two sources cover disjoint transactions, so there are
 *                   no twins; classification decides what a match means.
 * @param config     { matchWindowDays, standardIncomeCodes }
 * @returns { matches, remaining, flags, diagnostics }
 *   matches: [{ row, kind: 'U'|'M'|'S', expense?, payment?, code? }]
 *   remaining: [row…] (file order)
 *   flags: [{ rowNr, reason, detail }]
 *   diagnostics: [{ rowNr, text, belopp, why }] — near-miss explanation per
 *   unmatched row that plausibly should have matched
 */
export const matchRows = (rows, { expenses, payments, config }) => {
  const window = config.matchWindowDays ?? 5;
  const codes = config.standardIncomeCodes || [];
  const consumedExpenses = new Set();
  const consumedPayments = new Set();
  const matches = [];
  const remaining = [];
  const flags = [];
  const diagnostics = [];

  const flag = (row, reason, detail) => flags.push({ rowNr: row.rowNr, reason, detail });
  const diagnose = (row, why) =>
    diagnostics.push({ rowNr: row.rowNr, text: `${row.referens} / ${row.text}`, belopp: row.belopp, why });

  for (const row of rows) {
    if (!row.transdag) { remaining.push(row); continue; }

    if (row.belopp < 0) {
      const amount = -row.belopp;
      const candidates = expenses.filter((e) =>
        !consumedExpenses.has(e._id) &&
        e.bookkeepingAccount &&
        e.reimbursedDate &&
        sameAmount(e.amount, amount) &&
        dayDiff(row.transdag, e.reimbursedDate) <= window
      );
      if (candidates.length === 1) {
        consumedExpenses.add(candidates[0]._id);
        matches.push({ row, kind: 'U', expense: candidates[0] });
        continue;
      }
      if (candidates.length > 1) {
        flag(row, 'ambiguous-expense', `${candidates.length} reimbursed expenses match ${amount} kr on ${row.rowNr}`);
      } else {
        // Would it have matched if the treasurer had picked an account?
        const missing = expenses.find((e) =>
          !consumedExpenses.has(e._id) &&
          !e.bookkeepingAccount &&
          e.reimbursedDate &&
          sameAmount(e.amount, amount) &&
          dayDiff(row.transdag, e.reimbursedDate) <= window
        );
        if (missing) flag(row, 'expense-missing-account', `expense ${missing._id} matches but has no bookkeeping account`);
        else {
          // Near-miss diagnostics: explain why nothing matched this payout.
          const sameAmt = expenses.filter((e) => sameAmount(e.amount ?? NaN, amount));
          if (!sameAmt.length) {
            diagnose(row, `no reimbursed expense of ${amount} kr exists`);
          } else {
            diagnose(row, sameAmt.slice(0, 3).map((e) => {
              if (!e.reimbursedDate) return `expense ${e._id} has the right amount but no reimbursedDate (reimbursed before phase 1?)`;
              const dd = dayDiff(row.transdag, e.reimbursedDate);
              if (dd > window) return `expense ${e._id} has the right amount but reimbursedDate is ${dd} days off (window ±${window})`;
              return `expense ${e._id} already matched another row`;
            }).join('; '));
          }
        }
      }
      remaining.push(row);
      continue;
    }

    if (row.belopp > 0 && /^Swish\s/.test(row.text || '')) {
      const phone = normalizePhone(row.text);
      const fits = (p) =>
        p.mobile &&
        normalizePhone(p.mobile) === phone &&
        sameAmount(p.amount, row.belopp) &&
        p.date && dayDiff(row.transdag, p.date) <= window;
      const candidates = payments.filter((p) => !consumedPayments.has(p._id) && fits(p));
      const classify = (p) => {
        const code = findIncomeCode(p.message, codes);
        if (code) return { kind: 'S', code };
        if (isMemberPayment(p)) return { kind: 'M' };
        return null;
      };
      if (candidates.length >= 1) {
        // Several candidates are fine as long as they are interchangeable —
        // e.g. the same person buying two packets of clay the same day. The
        // verification is identical whichever we pick, so consume the one
        // closest in date and leave the rest for later rows. Conflicting
        // classifications stay unmatched (we can't know which one this row is).
        const classified = candidates.map(classify);
        const first = classified[0];
        const interchangeable = !!first && classified.every((c, i) =>
          c && c.kind === first.kind &&
          (first.kind !== 'S' || c.code.code === first.code.code) &&
          (first.kind !== 'M' || candidates[i].member === candidates[0].member)
        );
        if (interchangeable) {
          const best = [...candidates]
            .sort((a, b) => dayDiff(row.transdag, a.date) - dayDiff(row.transdag, b.date))[0];
          consumedPayments.add(best._id);
          matches.push({ row, kind: first.kind, payment: best, ...(first.code ? { code: first.code } : {}) });
          continue;
        }
        if (candidates.length === 1) {
          const payment = candidates[0];
          flag(row, 'unclassified-payment', `payment ${payment._id} found but is neither a member payment nor a configured income code`);
          diagnose(row, `payment ${payment._id} fits but is unclassifiable — link it to a member/membership in the Payments view, ` +
            `or add its code to accounting.standardIncome.codes. ` +
            `member: ${payment.member ? 'yes' : 'no'}, membership: ${payment.membership ? 'yes' : 'no'}, ` +
            `message: "${payment.message || ''}"`);
        } else {
          const kinds = [...new Set(classified.map((c) =>
            c ? (c.kind === 'S' ? `S:${c.code.code}` : 'M') : 'unclassified'))];
          flag(row, 'ambiguous-payment',
            `${candidates.length} payments fit ${row.belopp} kr from ...${phone} with conflicting classifications (${kinds.join(', ')})`);
        }
      } else {
        // Near-miss diagnostics for an incoming Swish row with no candidate.
        const samePhone = payments.filter((p) => p.mobile && normalizePhone(p.mobile) === phone);
        if (!samePhone.length) {
          diagnose(row, 'no payment from this phone number at all (neither Swish callback nor bank sync — has synchronize covered this period?)');
        } else {
          const sameAmt = samePhone.filter((p) => sameAmount(p.amount, row.belopp));
          if (!sameAmt.length) {
            diagnose(row, `payments from this number exist but none of ${row.belopp} kr`);
          } else {
            const dd = Math.min(...sameAmt.filter((p) => p.date).map((p) => dayDiff(row.transdag, p.date)));
            diagnose(row, `payment with matching number+amount exists but the date is ${dd} days off (window ±${window})`);
          }
        }
      }
      remaining.push(row);
      continue;
    }

    remaining.push(row);
  }

  return { matches, remaining, flags, diagnostics };
};
