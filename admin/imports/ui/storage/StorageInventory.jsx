import React, { useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import ButtonBase from '@mui/material/ButtonBase';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

const native = { select: { native: true }, inputLabel: { shrink: true } };
const grid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(175px, 1fr))', gap: 1.5 };

/** The colours of a unit by status, the overdue ones above all. */
export const UNIT_COLOURS = {
  available: { border: '#555', bg: '#fff', fg: '#222' },
  occupied: { border: '#217a32', bg: '#8fd19a', fg: '#123d1b' },
  reserved: { border: '#711b88', bg: '#d6a6e5', fg: '#40104d' },
  awaiting_clearance: { border: '#b64b00', bg: '#ffb66d', fg: '#572500' },
  unavailable: { border: '#495057', bg: '#bfc4c9', fg: '#25292d' },
  overdue: { border: '#a40000', bg: '#ef9292', fg: '#570000' },
};
const LEGEND = [['available', 'Available'], ['occupied', 'Occupied'], ['reserved', 'Reserved'], ['awaiting_clearance', 'Awaiting clearance'], ['overdue', 'Overdue'], ['unavailable', 'Unavailable']];

const coloursOf = (unit) => UNIT_COLOURS[unit._overdue ? 'overdue' : unit.availability_status] || UNIT_COLOURS.unavailable;

const blankUnit = { name: '', wall_id: '', column: '', row: '', availability_status: 'available', note: '' };

const CreateUnit = ({ walls, busy, onCreate }) => {
  const [values, setValues] = useState({ ...blankUnit, wall_id: walls[0]?._id || '' });
  const set = (field) => (e) => setValues((v) => ({ ...v, [field]: e.target.value }));
  return (
    <Box component="form" sx={{ ...grid, my: 1.5 }} onSubmit={(e) => {
      e.preventDefault();
      onCreate({ ...values, column: Number(values.column), row: Number(values.row) }, () => setValues({ ...blankUnit, wall_id: walls[0]?._id || '' }));
    }}>
      <TextField label="Name" required value={values.name} onChange={set('name')} />
      <TextField label="Wall" select required slotProps={native} value={values.wall_id} onChange={set('wall_id')}>
        {walls.map((w) => <option key={w._id} value={w._id}>{w.name}</option>)}
      </TextField>
      <TextField label="Column" type="number" required slotProps={{ htmlInput: { min: 1 } }} value={values.column} onChange={set('column')} />
      <TextField label="Row" type="number" required slotProps={{ htmlInput: { min: 1 } }} value={values.row} onChange={set('row')} />
      <TextField label="Status" select slotProps={native} value={values.availability_status} onChange={set('availability_status')}>
        <option value="available">Available</option><option value="unavailable">Unavailable</option>
      </TextField>
      <TextField label="Internal note" multiline minRows={2} value={values.note} onChange={set('note')} sx={{ gridColumn: '1 / -1' }} />
      <Box><Button type="submit" variant="contained" disabled={busy}>Create unit</Button></Box>
    </Box>
  );
};

/**
 * The storage units, filtered, and laid out as they hang: wall by wall,
 * column by column, row by row, coloured by status. Choosing a unit opens it.
 *
 * @param {{ walls: Array<{ _id, name, columns: Array<{ number, units }> }>, wallOptions: object[],
 *           activeWalls: object[], filters: object, onFilter: (field, value) => void,
 *           selectedId?: string, onSelect: (unitId) => void, busy?: boolean, error?: string,
 *           onCreate: (fields, done) => void }} props
 *   `walls` as groupStorageWalls makes them, the units with ownerName and _overdue.
 */
export const StorageInventory = ({ walls, wallOptions, activeWalls, filters, onFilter, selectedId, onSelect, busy = false, error, onCreate }) => {
  const [creating, setCreating] = useState(false);
  const select = (field, label, options) => (
    <TextField label={label} select slotProps={native} value={filters[field] || ''} onChange={(e) => onFilter(field, e.target.value)}>
      <option value="">All</option>
      {options.map(([value, text]) => <option key={value} value={value}>{text}</option>)}
    </TextField>
  );
  return (
    <Paper component="section" variant="outlined" sx={{ mt: 3, p: 2 }}>
      <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
        <Box>
          <Typography variant="h5" component="h2">Inventory</Typography>
          <Typography variant="body2" color="text.secondary">Placed by wall, column, and row. Status is conveyed by text and color.</Typography>
        </Box>
        <Button variant="outlined" onClick={() => setCreating((c) => !c)}>Add unit</Button>
      </Stack>
      {error && <Alert severity="error" sx={{ my: 1 }}>{error}</Alert>}
      {creating && <CreateUnit walls={activeWalls} busy={busy} onCreate={(fields, done) => onCreate(fields, () => { done(); setCreating(false); })} />}
      <Box sx={{ ...grid, my: 2 }}>
        <TextField label="Search" placeholder="name, wall or note" value={filters.query || ''} onChange={(e) => onFilter('query', e.target.value)} />
        {select('status', 'Status', [['available', 'Available'], ['occupied', 'Occupied'], ['reserved', 'Reserved'], ['awaiting_clearance', 'Awaiting clearance'], ['unavailable', 'Unavailable']])}
        {select('floor', 'Floor', [['floor1', 'Floor 1'], ['floor2', 'Floor 2']])}
        {select('height', 'Height', [['unclassified', 'Unclassified'], ['low', 'Low'], ['high', 'High']])}
        {select('wall', 'Wall', wallOptions.map((w) => [w._id, w.name]))}
        {select('warning', 'Warning', [['unwarned', 'Unwarned overdue'], ['warned', 'Warned'], ['exempt', 'Exempt']])}
        <FormControlLabel label="Has owner" control={<Checkbox checked={!!filters.owner} onChange={(e) => onFilter('owner', e.target.checked)} />} />
        <FormControlLabel label="Overdue only" control={<Checkbox checked={!!filters.overdue} onChange={(e) => onFilter('overdue', e.target.checked)} />} />
      </Box>
      <Stack direction="row" useFlexGap spacing={1} aria-label="Storage status legend" sx={{ flexWrap: 'wrap', mb: 2 }}>
        {LEGEND.map(([key, label]) => (
          <Box key={key} sx={{ px: 1.2, py: 0.5, border: 2, borderRadius: 1, borderColor: UNIT_COLOURS[key].border, bgcolor: UNIT_COLOURS[key].bg, color: UNIT_COLOURS[key].fg }}>{label}</Box>
        ))}
      </Stack>
      {walls.map((wall) => (
        <Box key={wall._id} sx={{ mb: 2 }}>
          <Typography variant="h6" component="h3">{wall.name}</Typography>
          <Box aria-label={`${wall.name} storage layout`} sx={{
            display: 'flex', width: 'max-content', maxWidth: '100%', gap: 0.5, overflowX: 'auto', p: 0.75,
            border: '3px solid #6d5b4b', borderTopWidth: 8, bgcolor: '#e2d4c6',
          }}>
            {wall.columns.map((column) => (
              <Stack key={column.number} spacing={0.5} aria-label={`Column ${column.number}`} sx={{ width: 61 }}>
                {column.units.map((unit) => (unit.empty
                  ? <Box key={`${column.number}-${unit.row}`} aria-label={`Empty position, column ${unit.column}, row ${unit.row}`} sx={{ minHeight: 40, border: '2px dashed #a89b8e', borderRadius: 0.5, bgcolor: 'rgba(255,255,255,.35)' }} />
                  : (
                    <ButtonBase key={unit._id} onClick={() => onSelect(unit._id)} title={unit.tooltip} aria-label={unit.tooltip}
                      sx={{
                        minHeight: 40, border: 2, borderRadius: 0.5, fontWeight: 700, px: 0.25,
                        borderColor: coloursOf(unit).border, bgcolor: coloursOf(unit).bg, color: coloursOf(unit).fg,
                        outline: unit._id === selectedId ? '3px solid #1565c0' : 'none',
                      }}>
                      <Box component="span" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{unit.name}</Box>
                    </ButtonBase>
                  )))}
              </Stack>
            ))}
          </Box>
        </Box>
      ))}
    </Paper>
  );
};
