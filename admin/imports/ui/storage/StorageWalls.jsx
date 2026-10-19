import React, { useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

const native = { select: { native: true }, inputLabel: { shrink: true } };
const grid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(175px, 1fr))', gap: 1.5 };

const blank = { name: '', floor: 'floor1', display_order: '', column_count: '', row_count: '', note: '', active: true };

/** A wall's fields; creates one without `wall`, else edits it. */
const WallForm = ({ wall, busy, onSubmit }) => {
  const [values, setValues] = useState(() => (wall ? { ...blank, ...wall, note: wall.note || '' } : blank));
  const set = (field) => (e) => setValues((v) => ({ ...v, [field]: e.target.value }));
  return (
    <Box component="form" sx={{ ...grid, my: 1.5 }} onSubmit={(e) => {
      e.preventDefault();
      onSubmit({
        name: values.name, floor: values.floor, display_order: Number(values.display_order),
        column_count: Number(values.column_count), row_count: Number(values.row_count), active: !!values.active, note: values.note || null,
      }, () => setValues(blank));
    }}>
      <TextField label="Name" required value={values.name} onChange={set('name')} />
      <TextField label="Floor" select slotProps={native} value={values.floor} onChange={set('floor')}>
        <option value="floor1">Floor 1</option><option value="floor2">Floor 2</option>
      </TextField>
      <TextField label="Display order" type="number" required slotProps={{ htmlInput: { min: 1 } }} value={values.display_order} onChange={set('display_order')} />
      <TextField label="Columns" type="number" required slotProps={{ htmlInput: { min: 1 } }} value={values.column_count} onChange={set('column_count')} />
      <TextField label="Rows" type="number" required slotProps={{ htmlInput: { min: 1 } }} value={values.row_count} onChange={set('row_count')} />
      {wall && <FormControlLabel label="Active" control={<Checkbox checked={!!values.active} onChange={(e) => setValues((v) => ({ ...v, active: e.target.checked }))} />} />}
      <TextField label="Internal note" multiline minRows={2} value={values.note} onChange={set('note')} sx={{ gridColumn: '1 / -1' }} />
      <Box><Button type="submit" variant="contained" disabled={busy}>{wall ? 'Save wall' : 'Create wall'}</Button></Box>
    </Box>
  );
};

/**
 * The walls the storage units hang on: their columns and rows, order and
 * floor, and adding one.
 *
 * @param {{ walls: object[], unitCount: (wallId) => number, busy?: boolean, error?: string,
 *           onCreate: (fields, done) => void, onUpdate: (wallId, fields) => void }} props
 *   `onCreate` calls `done` once the wall exists, which empties the form.
 */
export const StorageWalls = ({ walls, unitCount, busy = false, error, onCreate, onUpdate }) => {
  const [creating, setCreating] = useState(false);
  return (
    <Paper component="section" variant="outlined" sx={{ mt: 3, p: 2 }}>
      <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
        <Box>
          <Typography variant="h5" component="h2">Walls</Typography>
          <Typography variant="body2" color="text.secondary">Define the uniform columns and rows used by the storage layout.</Typography>
        </Box>
        <Button variant="outlined" onClick={() => setCreating((c) => !c)}>Add wall</Button>
      </Stack>
      {error && <Alert severity="error" sx={{ my: 1 }}>{error}</Alert>}
      {creating && <WallForm busy={busy} onSubmit={(fields, done) => onCreate(fields, () => { done(); setCreating(false); })} />}
      <Stack spacing={1} sx={{ mt: 1.5 }}>
        {walls.map((wall) => (
          <Box component="details" key={wall._id} sx={{ border: 1, borderColor: 'divider', borderRadius: 1, p: 1, '& summary': { cursor: 'pointer' } }}>
            <summary>
              <strong>{wall.name}</strong> · {wall.column_count} × {wall.row_count} · {unitCount(wall._id)} unit(s){wall.active ? '' : ' · inactive'}
            </summary>
            <WallForm wall={wall} busy={busy} onSubmit={(fields) => onUpdate(wall._id, fields)} />
          </Box>
        ))}
      </Stack>
    </Paper>
  );
};
