import React from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import Link from '@mui/material/Link';
import Typography from '@mui/material/Typography';
import { ServerDataList } from '../components/ServerDataList';
import { moment } from '../announcements/labels';

const columns = [
  { field: 'timestamp', headerName: 'Time', width: 170, valueFormatter: (v) => moment(v) },
  { field: 'door', headerName: 'Door', width: 120 },
  { field: 'method', headerName: 'Method', width: 100 },
  {
    field: 'memberid', headerName: 'Member ID', width: 200,
    renderCell: ({ value }) => (value ? <Link href={`/member/${value}`} underline="hover">{value}</Link> : ''),
  },
  { field: 'memberName', headerName: 'Name', flex: 1, minWidth: 160, sortable: false },
  { field: 'extid', headerName: 'External ID', flex: 1, minWidth: 200 },
];

/**
 * Every opening of the doors, newest first, paged on the server. Names are
 * left out unless asked for.
 *
 * @param {{ rows: object[], total: number, loading: boolean, error?: string, query: object,
 *           onQueryChange: (query) => void, showNames: boolean, onShowNamesChange: (show) => void }} props
 */
export const DoorUnlockList = ({ showNames, onShowNamesChange, error, ...list }) => (
  <Box>
    <Typography variant="h4" component="h1" sx={{ mb: 1 }}>Door unlocks</Typography>
    <FormControlLabel sx={{ mb: 1 }} label="Show names"
      control={<Checkbox size="small" checked={showNames} onChange={(e) => onShowNamesChange(e.target.checked)} />} />
    {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
    <ServerDataList {...list} columns={columns} empty="No door openings." columnVisibilityModel={{ memberName: showNames }} />
  </Box>
);
