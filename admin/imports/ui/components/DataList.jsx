import React from 'react';
import TextField from '@mui/material/TextField';
import { DataGrid } from '@mui/x-data-grid/DataGrid';
import { QuickFilter, QuickFilterControl, Toolbar } from '@mui/x-data-grid/components';
import { useNavigate } from '../navigation';

export const PAGE_SIZES = [25, 50, 100];

/**
 * How every list looks: a faint line between the cells, darker on the row
 * under the pointer (grey, not the heading's red, which means resizing).
 */
export const GRID_SX = {
  backgroundColor: 'background.paper',
  '& .MuiDataGrid-cell': { borderRight: '1px solid', borderRightColor: 'rgba(0, 0, 0, 0.06)' },
  '& .MuiDataGrid-row:hover .MuiDataGrid-cell': { borderRightColor: 'rgba(0, 0, 0, 0.22)' },
};

/** The toolbar: a search box over all columns, always open. */
export const SearchToolbar = () => (
  <Toolbar style={{ justifyContent: 'flex-start' }}>
    <QuickFilter defaultExpanded>
      <QuickFilterControl
        render={({ ref, ...controlProps }) => (
          <TextField {...controlProps} inputRef={ref} type="search" size="small" placeholder="Search…" aria-label="Search"
            sx={{ width: 300 }} />
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
 * lists. Large lists page on the server: ServerDataList.
 *
 * With `rowHref` the whole row opens the row's page: a click anywhere, Enter
 * on a cell, or Ctrl/Cmd-click for a new tab. Most lists should give one;
 * keep a link column too, for the keyboard and middle-click.
 *
 * @param {{ rows: object[], columns: object[], loading?: boolean, empty?: string,
 *           defaultSort?: { field: string, sort: 'asc'|'desc' }, rowHref?: (row) => string }} props
 */
export const DataList = ({
  rows, columns, loading = false, empty = 'Nothing here yet.', defaultSort, rowHref, initialState, slotProps, sx, ...props
}) => {
  const navigate = useNavigate();
  const open = (row, event) => {
    const href = rowHref(row);
    if (event.metaKey || event.ctrlKey) window.open(href, '_blank');
    else navigate(href);
  };
  const rowProps = rowHref ? {
    // A click on a link in the row is the link's own; anything else opens the row.
    onRowClick: ({ row }, event) => { if (!event.target.closest('a')) open(row, event); },
    onCellKeyDown: ({ row }, event) => { if (event.key === 'Enter') open(row, event); },
  } : {};
  return (
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
      // No column menu: sorting is a click on the heading, and the menu, shown
      // on hover, stays visible on a phone.
      disableColumnMenu
      disableColumnFilter
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
      sx={{ ...GRID_SX, ...(rowHref ? { '& .MuiDataGrid-row': { cursor: 'pointer' } } : {}), ...sx }}
      {...rowProps}
      {...props}
    />
  );
};
