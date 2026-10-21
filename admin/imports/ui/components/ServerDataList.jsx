import React from 'react';
import { DataGrid } from '@mui/x-data-grid/DataGrid';
import { useNavigate } from '../navigation';
import { PAGE_SIZES, SearchToolbar } from './DataList';

/**
 * A list too large for the browser: DataList's search box, sorting and
 * paging, done on the server. The page shows `rows`, one page of `total`;
 * every change of search, sort or page comes to `onQueryChange`, and the
 * container fetches that page (useServerList does it).
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
      disableDensitySelector
      disableColumnFilter
      paginationMode="server"
      sortingMode="server"
      filterMode="server"
      pageSizeOptions={PAGE_SIZES}
      paginationModel={{ page: query.page, pageSize: query.pageSize }}
      onPaginationModelChange={({ page, pageSize }) => onQueryChange({ ...query, page: pageSize === query.pageSize ? page : 0, pageSize })}
      sortModel={query.sort ? [{ field: query.sort.field, sort: query.sort.direction }] : []}
      onSortModelChange={([first]) => onQueryChange({ ...query, page: 0, sort: first ? { field: first.field, direction: first.sort } : null })}
      filterModel={{ items: [], quickFilterValues: query.search ? [query.search] : [] }}
      onFilterModelChange={(model) => onQueryChange({ ...query, page: 0, search: (model.quickFilterValues || []).join(' ') })}
      localeText={{ noRowsLabel: empty, noResultsOverlayLabel: 'No matches.' }}
      slots={{ toolbar: SearchToolbar }}
      sx={{ backgroundColor: 'background.paper', ...(rowHref ? { '& .MuiDataGrid-row': { cursor: 'pointer' } } : {}), ...sx }}
      {...rowProps}
      {...props}
    />
  );
};
