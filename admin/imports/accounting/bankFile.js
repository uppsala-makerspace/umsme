import iconv from 'iconv-lite';

// Parsing of Swedbank transaction-report CSVs (Latin-1/CP1252). The remaining
// CSV must be byte-faithful to the upload minus matched rows, so we keep every
// original line verbatim and only *additionally* parse the fields we match on.

const ENCODING = 'win1252';

// Quote-aware split of one CSV line ("" escapes a quote inside a quoted field).
export const splitCsvLine = (line) => {
  const fields = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') inQuotes = false;
      else cur += ch;
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      fields.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  fields.push(cur);
  return fields;
};

// Dates in the file are plain YYYY-MM-DD; parse as local midnight so day-window
// comparisons against DB dates (also local) behave.
const parseDate = (s) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec((s || '').trim());
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
};

/**
 * Parse an uploaded bank file Buffer. Returns:
 *   { headerLines, rows, eol, trailingNewline }
 * where each row is { raw, rowNr, bokfdag, transdag, referens, text, belopp }.
 * `raw` is the original line, preserved verbatim for the remaining CSV.
 */
export const parseBankFile = (buffer) => {
  const content = iconv.decode(buffer, ENCODING);
  const eol = content.includes('\r\n') ? '\r\n' : '\n';
  const trailingNewline = /\r?\n$/.test(content);
  const lines = content.split(/\r?\n/);
  if (trailingNewline) lines.pop();

  const headerIdx = lines.findIndex((l) => l.startsWith('Radnr,'));
  if (headerIdx === -1) {
    throw new Error('unrecognized-format: no "Radnr,..." column header line found');
  }
  const headerLines = lines.slice(0, headerIdx + 1);
  const cols = splitCsvLine(lines[headerIdx]);
  const col = (name) => {
    const idx = cols.indexOf(name);
    if (idx === -1) throw new Error(`unrecognized-format: missing column ${name}`);
    return idx;
  };
  const iRadnr = col('Radnr');
  const iBokfdag = col('Bokfdag');
  const iTransdag = col('Transdag');
  const iReferens = col('Referens');
  const iText = col('Text');
  const iBelopp = col('Belopp');

  const rows = lines.slice(headerIdx + 1)
    .filter((l) => l.trim() !== '')
    .map((raw) => {
      const f = splitCsvLine(raw);
      const belopp = Number(f[iBelopp]);
      if (Number.isNaN(belopp)) throw new Error(`unrecognized-format: bad amount on line "${raw}"`);
      return {
        raw,
        rowNr: f[iRadnr],
        bokfdag: parseDate(f[iBokfdag]),
        transdag: parseDate(f[iTransdag]),
        referens: f[iReferens],
        text: f[iText],
        belopp,
      };
    });

  return { headerLines, rows, eol, trailingNewline };
};

/**
 * Rebuild a CSV in the original format/encoding containing only `keptRows`
 * (in file order), with the original header lines.
 */
export const buildRemainingCsv = (parsed, keptRows) => {
  const lines = [...parsed.headerLines, ...keptRows.map((r) => r.raw)];
  let content = lines.join(parsed.eol);
  if (parsed.trailingNewline) content += parsed.eol;
  return iconv.encode(content, ENCODING);
};
