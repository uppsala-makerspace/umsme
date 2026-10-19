import React from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { ServerDataList } from '../components/ServerDataList';
import { memberColumns } from './memberColumns';

/**
 * A list of members, paged on the server: a title, what the list holds, any
 * actions, and the members.
 *
 * @param {{ title: string, note?: string, actions?: React.ReactNode, children?: React.ReactNode,
 *           rows: object[], total: number, loading: boolean, error?: string,
 *           query: object, onQueryChange: (query) => void, empty?: string }} props
 *   `children` comes between the note and the list (a result, say).
 */
export const MemberList = ({ title, note, actions, children, rows, total, loading, error, query, onQueryChange, empty = 'No members.' }) => (
  <Box>
    <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: note ? 1 : 2 }}>
      <Typography variant="h4" component="h1">{title}</Typography>
      {actions}
    </Stack>
    {note && <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{note}</Typography>}
    {children}
    {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
    <ServerDataList
      rows={rows} total={total} loading={loading} columns={memberColumns} empty={empty}
      query={query} onQueryChange={onQueryChange} rowHref={(m) => `/member/${m._id}`}
    />
  </Box>
);
