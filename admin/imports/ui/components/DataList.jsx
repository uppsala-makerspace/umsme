import React from 'react';
import TextField from '@mui/material/TextField';
import { DataGrid } from '@mui/x-data-grid/DataGrid';
import { QuickFilter, QuickFilterControl, Toolbar } from '@mui/x-data-grid/components';

export const PAGE_SIZES = [25, 50, 100];

/** The toolbar: a search box over all columns, always open. */
const SearchToolbar = () => (
  <Toolbar style={{ justifyContent: 'flex-start' }}>
    <QuickFilter defaultExpanded>
      <QuickFilterControl
        render={({ ref, ...controlProps }) => (
          // content-box: Bootstrap 3 gives input[type=search] border-box,
          // which squeezes MUI's input. Drop with Bootstrap.
          <TextField {...controlProps} inputRef={ref} type="search" size="small" placeholder="Search…" aria-label="Search"
            sx={{ width: 300, '& input': { boxSizing: 'content-box' } }} />
        )}
      />
    </QuickFilter>
  </Toolbar>
);

/**
 * Every list in admin: an MUI X DataGrid with the same behaviour everywhere,
 * a search box, sorting by any column, rows per page and pagination, and the
 * same loading and empty states.
 *
 * Thin on purpose. It sets defaults and passes every other prop to DataGrid,
 * so a list that needs something particular uses DataGrid's own props for it.
 * Columns come from the list itself, mostly built with the helpers in
 * columns.jsx.
 *
 * With `rows` it sorts, searches and pages in the browser, which suits small
 * lists. Large lists will page on the server (plan/migration.md).
 *
 * @param {{ rows: object[], columns: object[], loading?: boolean, empty?: string,
 *           defaultSort?: { field: string, sort: 'asc'|'desc' } }} props
 */
export const DataList = ({ rows, columns, loading = false, empty = 'Nothing here yet.', defaultSort, initialState, slotProps, ...props }) => (
  <DataGrid
    rows={rows}
    columns={columns}
    loading={loading}
    getRowId={(row) => row._id}
    density="compact"
    autoHeight
    showToolbar
    disableRowSelectionOnClick
    disableColumnSelector
    disableDensitySelector
    pageSizeOptions={PAGE_SIZES}
    initialState={{
      pagination: { paginationModel: { pageSize: PAGE_SIZES[0] } },
      ...(defaultSort ? { sorting: { sortModel: [defaultSort] } } : {}),
      ...initialState,
    }}
    localeText={{ noRowsLabel: empty, noResultsOverlayLabel: 'No matches.' }}
    slots={{ toolbar: SearchToolbar }}
    slotProps={slotProps}
    sx={{ backgroundColor: 'background.paper' }}
    {...props}
  />
);
