import React from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { ServerDataList } from '../components/ServerDataList';

const columns = [
  { field: 'username', headerName: 'Username', flex: 1, minWidth: 160, renderCell: ({ row, value }) => <Link href={`/user/${row._id}`} underline="hover">{value || '—'}</Link> },
  { field: 'email', headerName: 'Email', flex: 1, minWidth: 220, sortable: false },
  { field: 'roles', headerName: 'Roles', width: 260, sortable: false, renderCell: ({ value }) => value.map((r) => <Chip key={r} size="small" label={r} sx={{ mr: 0.5 }} />) },
  { field: 'createdAt', headerName: 'Created', width: 120, valueFormatter: (v) => (v ? new Date(v).toLocaleDateString('sv-SE') : '') },
];

/**
 * The user accounts, paged on the server, with their admin roles.
 *
 * @param {{ rows: object[], total: number, loading: boolean, error?: string, query: object, onQueryChange: (query) => void }} props
 */
export const UserList = ({ rows, total, loading, error, query, onQueryChange }) => (
  <Box>
    <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
      <Typography variant="h4" component="h1">Users</Typography>
      <Button variant="contained" href="/users/add">Add user</Button>
    </Stack>
    {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
    <ServerDataList rows={rows} total={total} loading={loading} columns={columns} empty="No users." query={query} onQueryChange={onQueryChange} rowHref={(u) => `/user/${u._id}`} />
  </Box>
);
