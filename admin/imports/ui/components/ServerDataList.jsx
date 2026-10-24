import React, { useMemo } from 'react';
import { DataGrid } from '@mui/x-data-grid/DataGrid';
import { useNavigate } from '../navigation';
import { PAGE_SIZES, SearchToolbar } from './DataList';

/**
 * A list too large for the browser: DataList's search box, sorting and
 * paging, done on the server. The page shows `rows`, one page of `total`;
 * every change of search, sort or page comes to `onQueryChange`, and the
 * container fetches that page (useServerList does it). The grid reports its
 * search and sort again also when they have not changed (after a page
 * change, say); only a real change starts over at the first page.
 *
 * @param {{ rows: object[], total: number, columns: object[], loading?: boolean, empty?: string,
 *           query: { page: number, pageSize: number, sort: { field, direction }|null, search: string },
 *           onQueryChange: (query) => void, rowHref?: (row) => string }} props
 */
export const ServerDataList = ({ rows, total, columns, loading = false, empty = 'Nothing here yet.', query, onQueryChange, rowHref, sx, ...props }) => {
  const navigate = useNavigate();
  const open = (row, event) => {
    const href = rowHref(row);
    if (event.metaKey || event.ctrlKey) window.open(href, '_blank');
    else navigate(href);
  };
  // Stable models: the grid takes a new filter or sort model object for a new
  // filter or sort, and goes back to the first page with it.
  const sortField = query.sort?.field;
  const sortDirection = query.sort?.direction;
  const sortModel = useMemo(() => (sortField ? [{ field: sortField, sort: sortDirection }] : []), [sortField, sortDirection]);
  const filterModel = useMemo(() => ({ items: [], quickFilterValues: query.search ? [query.search] : [] }), [query.search]);
  const paginationModel = useMemo(() => ({ page: query.page, pageSize: query.pageSize }), [query.page, query.pageSize]);
  const rowProps = rowHref ? {
    onRowClick: ({ row }, event) => { if (!event.target.closest('a')) open(row, event); },
    onCellKeyDown: ({ row }, event) => { if (event.key === 'Enter') open(row, event); },
  } : {};
  return (
    <DataGrid
      rows={rows}
      rowCount={total}
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
      disableDensitySelector
      disableColumnFilter
      paginationMode="server"
      sortingMode="server"
      filterMode="server"
      pageSizeOptions={PAGE_SIZES}
      paginationModel={paginationModel}
      onPaginationModelChange={({ page, pageSize }) => onQueryChange({ ...query, page: pageSize === query.pageSize ? page : 0, pageSize })}
      sortModel={sortModel}
      onSortModelChange={([first]) => {
        const sort = first ? { field: first.field, direction: first.sort } : null;
        if (sort?.field !== query.sort?.field || sort?.direction !== query.sort?.direction) onQueryChange({ ...query, page: 0, sort });
      }}
      filterModel={filterModel}
      onFilterModelChange={(model) => {
        const search = (model.quickFilterValues || []).join(' ');
        if (search !== query.search) onQueryChange({ ...query, page: 0, search });
      }}
      localeText={{ noRowsLabel: empty, noResultsOverlayLabel: 'No matches.' }}
      slots={{ toolbar: SearchToolbar }}
      sx={{ backgroundColor: 'background.paper', ...(rowHref ? { '& .MuiDataGrid-row': { cursor: 'pointer' } } : {}), ...sx }}
      {...rowProps}
      {...props}
    />
  );
};
