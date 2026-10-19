import React from 'react';
import Autocomplete from '@mui/material/Autocomplete';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Link from '@mui/material/Link';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { StorageMemberPicker } from './StorageMemberPicker';

/**
 * The storage event log, newest first, up to 500 events, filtered by member
 * and unit.
 *
 * @param {{ rows: object[], members: object[], units: object[], filters: { member_id?, unit_id? },
 *           onFilter: (field, value) => void, onClear: () => void }} props
 *   Rows as storageEventRows makes them.
 */
export const StorageEventLog = ({ rows, members, units, filters, onFilter, onClear }) => (
  <Paper component="section" variant="outlined" sx={{ mt: 3, p: 2 }}>
    <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
      <Box>
        <Typography variant="h5" component="h2">Event log</Typography>
        <Typography variant="body2" color="text.secondary">Read-only history of storage changes, newest first, up to 500 events.</Typography>
      </Box>
      <Button variant="outlined" onClick={onClear}>Clear filters</Button>
    </Stack>
    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ my: 2 }}>
      <Box sx={{ flex: 1 }}><StorageMemberPicker label="Member" members={members} value={filters.member_id || null} onChange={(id) => onFilter('member_id', id || '')} /></Box>
      <Autocomplete sx={{ flex: 1 }} options={units} value={units.find((u) => u._id === filters.unit_id) || null}
        onChange={(event, unit) => onFilter('unit_id', unit?._id || '')} getOptionLabel={(u) => u.name} isOptionEqualToValue={(a, b) => a._id === b._id}
        renderInput={(params) => <TextField {...params} label="Storage unit" placeholder="Search by unit name" />} />
    </Stack>
    {rows.length === 0 ? <Typography>No events match these filters.</Typography> : (
      <Box sx={{ maxHeight: '38rem', overflow: 'auto', border: 1, borderColor: 'divider' }}>
        <Table size="small" stickyHeader>
          <TableHead><TableRow><TableCell>When</TableCell><TableCell>Event</TableCell><TableCell>Member</TableCell><TableCell>Storage unit</TableCell><TableCell>Actor</TableCell><TableCell>Reason and details</TableCell></TableRow></TableHead>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row._id}>
                <TableCell sx={{ whiteSpace: 'nowrap' }}><time>{new Date(row.occurred_at).toLocaleString()}</time></TableCell>
                <TableCell sx={{ minWidth: 190 }}><strong>{row.eventLabel}</strong><br /><small>{row.entityLabel}</small></TableCell>
                <TableCell>{row.ownerIds.length === 1 ? <Link href={`/member/${row.ownerIds[0]}`}>{row.memberLabel}</Link> : row.memberLabel}</TableCell>
                <TableCell>{row.unitLabel}</TableCell>
                <TableCell>{row.actorLabel}</TableCell>
                <TableCell>
                  {row.reason}
                  {row.detailsLabel && (
                    <Box component="details" sx={{ mt: 0.5, '& summary': { cursor: 'pointer' } }}>
                      <summary>Details</summary>
                      <Box component="pre" sx={{ maxWidth: '42rem', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', m: 0 }}>{row.detailsLabel}</Box>
                    </Box>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>
    )}
  </Paper>
);
