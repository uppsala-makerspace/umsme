import React from 'react';
import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import { day, expiryTone } from '../dates';

/**
 * Column definitions that recur across lists. Each returns a plain DataGrid
 * column, so a list can spread it and override anything:
 *
 *   { ...dateColumn('date', 'Date'), width: 120 }
 */

/** A day stored at midnight UTC, shown and sorted as YYYY-MM-DD. */
export const dateColumn = (field, headerName, options = {}) => ({
  field,
  headerName,
  type: 'date',
  width: 140,
  valueGetter: (value) => (value ? new Date(value) : null),
  valueFormatter: (value) => (value ? value.toISOString().substring(0, 10) : ''),
  ...options,
});

/**
 * Text that links to the row's own page. Searching and sorting use the text.
 *
 * @param {(row) => string} href
 */
export const linkColumn = (field, headerName, href, options = {}) => ({
  field,
  headerName,
  flex: 1,
  minWidth: 200,
  renderCell: ({ row, value }) => (
    <Link href={href(row)} underline="hover" sx={{ fontWeight: 600 }}>{value}</Link>
  ),
  ...options,
});

const TONES = {
  past: { color: '#b71c1c', backgroundColor: 'rgba(211, 47, 47, 0.1)' },
  soon: { color: '#9a4a00', backgroundColor: 'rgba(237, 108, 2, 0.14)' },
  later: { color: '#1b5e20', backgroundColor: 'rgba(46, 125, 50, 0.12)' },
};

/**
 * An end date (when something runs out) as a list shows it, YYYY-MM-DD,
 * tinted by how it stands: faint red once passed, faint orange within a
 * month, green after that. `empty` stands for none.
 */
export const ExpiryDate = ({ value, empty = '', now }) => {
  const tone = expiryTone(value, now);
  if (!tone) return empty;
  return <Box component="span" sx={{ ...TONES[tone], px: 0.75, py: 0.25, borderRadius: 1 }}>{day(value)}</Box>;
};

/**
 * A column of end dates, tinted as ExpiryDate does; sorted by the date.
 * Not for dates of what happened (a payment, a start): those are all past.
 */
export const expiryColumn = (field, headerName, { empty = '', ...options } = {}) => ({
  field,
  headerName,
  width: 125,
  valueGetter: (value) => (value ? new Date(value) : null),
  // What the search box matches on: the day as shown.
  valueFormatter: (value) => (value ? day(value) : empty),
  renderCell: ({ value }) => <ExpiryDate value={value} empty={empty} />,
  ...options,
});
