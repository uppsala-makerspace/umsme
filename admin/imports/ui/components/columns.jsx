import React from 'react';
import Link from '@mui/material/Link';

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
