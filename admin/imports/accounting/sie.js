import iconv from 'iconv-lite';

// SIE 4i generation (import file with ready verifications; no chart of
// accounts, no balances). Encoding is PC8 / codepage 437 per the SIE standard.
// Verification numbers are deliberately left empty: the bookkeeping system
// (Spiris) assigns them into its own unbroken series per category — UMSME is
// stateless and must not keep counters.

const fmtDate = (d) =>
  `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;

const fmtAmount = (n) => n.toFixed(2);

// SIE strings are quoted; embedded quotes escaped with backslash. Also flatten
// characters CP437 can't hold (typographic dashes/quotes) to safe equivalents.
const sieStr = (s) =>
  `"${String(s || '')
    .replace(/[–—]/g, '-')
    .replace(/[’‘]/g, "'")
    .replace(/[”“]/g, "'")
    .replace(/\\/g, '/')
    .replace(/"/g, '\\"')}"`;

const objectList = (dimension) => {
  if (!dimension) return '{}';
  const parts = Object.keys(dimension)
    .sort()
    .map((nr) => `${nr} ${sieStr(dimension[nr])}`);
  return `{${parts.join(' ')}}`;
};

const driveLink = (fileId) => `https://drive.google.com/file/d/${fileId}/view`;

/**
 * Compose verification objects from matcher output.
 * ctx: { config: settings.accounting, expenseAccountsById, memberNameById }
 * Each verification: { series, date, text, trans: [{ account, dimension, amount }] }
 * (amount sign: positive = debit, negative = credit; each ver balances to 0).
 */
export const toVerifications = (matches, ctx) => {
  const { config, expenseAccountsById, memberNameById } = ctx;
  const bank = config.bankAccount;
  return matches.map(({ row, kind, expense, payment, code }) => {
    if (kind === 'U') {
      const account = expenseAccountsById[expense.expenseAccountId];
      const memberName = memberNameById[expense.memberId] || expense.memberId;
      return {
        series: config.expense?.series || 'U',
        date: row.transdag,
        text: `Utlägg ${expense._id} ${memberName} kvitto: ${driveLink(expense.driveFileId)}`,
        trans: [
          { account: expense.bookkeepingAccount, dimension: account?.dimensions || null, amount: -row.belopp },
          { account: bank, dimension: null, amount: row.belopp },
        ],
      };
    }
    if (kind === 'S') {
      return {
        series: config.standardIncome?.series || 'S',
        date: row.transdag,
        text: `${code.code} ${payment.name || payment.mobile || ''}`.trim(),
        trans: [
          { account: bank, dimension: null, amount: row.belopp },
          { account: code.account, dimension: code.dimension || null, amount: -row.belopp },
        ],
      };
    }
    // 'M' — member payment
    const memberName = memberNameById[payment.member] || payment.name || payment.member;
    const pt = /\bpt:([\wåäöÅÄÖ-]+)/.exec(payment.message || '')?.[1];
    return {
      series: config.memberPayment?.series || 'M',
      date: row.transdag,
      text: `Medlemsbetalning ${memberName}${pt ? ` (${pt})` : ''}`,
      trans: [
        { account: bank, dimension: null, amount: row.belopp },
        { account: config.memberPayment?.account, dimension: config.memberPayment?.dimension || null, amount: -row.belopp },
      ],
    };
  });
};

/**
 * Build the SIE 4i file as a CP437-encoded Buffer.
 * dimensionNames: { "1": "Kostnadsställe", ... } from settings.accounting.dimensions.
 */
export const buildSie = (verifications, { company, dimensionNames }, genDate) => {
  const lines = [
    '#FLAGGA 0',
    `#PROGRAM ${sieStr('UMSME')} ${sieStr('1.0')}`,
    '#FORMAT PC8',
    `#GEN ${fmtDate(genDate)}`,
    '#SIETYP 4',
    `#ORGNR ${company.orgNo}`,
    `#FNAMN ${sieStr(company.name)}`,
  ];

  // Declare only the dimensions/objects actually used on verification rows.
  const usedObjects = new Map(); // dimNr -> Set(objectCode)
  for (const ver of verifications) {
    for (const t of ver.trans) {
      for (const [nr, obj] of Object.entries(t.dimension || {})) {
        if (!usedObjects.has(nr)) usedObjects.set(nr, new Set());
        usedObjects.get(nr).add(obj);
      }
    }
  }
  for (const nr of [...usedObjects.keys()].sort()) {
    lines.push(`#DIM ${nr} ${sieStr(dimensionNames[nr] || `Dimension ${nr}`)}`);
    for (const obj of [...usedObjects.get(nr)].sort()) {
      lines.push(`#OBJEKT ${nr} ${sieStr(obj)} ${sieStr(obj)}`);
    }
  }

  for (const ver of verifications) {
    const sum = ver.trans.reduce((acc, t) => acc + Math.round(t.amount * 100), 0);
    if (sum !== 0) {
      throw new Error(`unbalanced verification: ${ver.text}`);
    }
    // Empty verification number — Spiris assigns it within the series.
    lines.push(`#VER ${sieStr(ver.series)} "" ${fmtDate(ver.date)} ${sieStr(ver.text)}`);
    lines.push('{');
    for (const t of ver.trans) {
      lines.push(`   #TRANS ${t.account} ${objectList(t.dimension)} ${fmtAmount(t.amount)}`);
    }
    lines.push('}');
  }

  return iconv.encode(lines.join('\r\n') + '\r\n', 'cp437');
};
