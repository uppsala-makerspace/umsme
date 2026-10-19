import React from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { DataList } from '../components/DataList';
import { linkColumn } from '../components/columns';

const FLOORS = { floor1: 'Floor 1', floor2: 'Floor 2' };

const columns = [
  { field: 'spaceId', headerName: 'Space id (map key)', width: 200 },
  { field: 'floor', headerName: 'Floor', width: 110, valueGetter: (value) => FLOORS[value] || value },
  linkColumn('name', 'Name', (space) => `/space/${space._id}`, { valueGetter: (value) => value?.sv || value?.en || '' }),
  { field: 'iconFileId', headerName: 'Icon', type: 'boolean', width: 90, valueGetter: (value) => !!value },
  { field: 'iconSize', headerName: 'Icon size', type: 'number', width: 110 },
];

/**
 * The spaces on the app's map.
 *
 * @param {{ loading: boolean, spaces: object[], onImport: () => void,
 *           importResult?: { imported, skipped, icons }, importing?: boolean }} props
 */
export const SpaceList = ({ loading, spaces, onImport, importResult, importing = false }) => (
  <Box>
    <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
      <Typography variant="h4" component="h1">Spaces</Typography>
      <Stack direction="row" spacing={1}>
        <Button onClick={onImport} disabled={importing}>Import from rooms.json</Button>
        <Button variant="contained" href="/spaces/add">Add space</Button>
      </Stack>
    </Stack>
    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
      The spaces on the app&apos;s map. A space is placed by its map key, which must match the floor plan&apos;s SVG
      elements (<code>&lt;key&gt;-marker</code>, <code>&lt;key&gt;-floor</code>).
    </Typography>
    {importResult && (
      <Alert severity="success" sx={{ mb: 2 }}>
        Imported {importResult.imported}, skipped {importResult.skipped} already there, {importResult.icons} icons uploaded.
      </Alert>
    )}
    <DataList
      rowHref={(space) => `/space/${space._id}`}
      rows={spaces}
      columns={columns}
      loading={loading}
      empty="No spaces yet."
      defaultSort={{ field: 'spaceId', sort: 'asc' }}
    />
  </Box>
);
