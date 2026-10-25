import React, { useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { DataList } from '../components/DataList';
import { categoryValues } from './values';

/**
 * The categories of activities, the website's filter: a short list, each
 * added and changed in a dialog. A category in use can not be deleted.
 *
 * @param {{ loading: boolean, categories: object[], usage: (id) => number,
 *           onSave: (values, category|null) => Promise<boolean>, onDelete: (category) => void,
 *           busy?: boolean, error?: string }} props
 *   `onSave` resolves to whether it saved, so the dialog closes only then.
 */
export const CategoryList = ({ loading, categories, usage, onSave, onDelete, busy = false, error }) => {
  const [editing, setEditing] = useState(null);
  const [values, setValues] = useState(categoryValues(null));
  const open = (category) => { setEditing(category || 'new'); setValues(categoryValues(category)); };
  const text = (name) => ({ value: values[name], onChange: (e) => setValues((v) => ({ ...v, [name]: e.target.value })) });
  const current = editing && editing !== 'new' ? editing : null;
  const columns = [
    { field: 'name', headerName: 'Name', flex: 1, minWidth: 200, valueGetter: (value) => value?.sv || '' },
    { field: 'nameEn', headerName: 'English', flex: 1, minWidth: 160, valueGetter: (value, row) => row.name?.en || '' },
    { field: 'sortOrder', headerName: 'Order', type: 'number', width: 90 },
    { field: 'used', headerName: 'Used by', type: 'number', width: 100, valueGetter: (value, row) => usage(row._id) },
  ];
  return (
    <Box>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4" component="h1">Activity categories</Typography>
        <Button variant="contained" onClick={() => open(null)}>Add category</Button>
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        What the website filters activities by. Lower order comes first; a click on a row changes it.
      </Typography>
      {error && !editing && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <DataList
        rows={categories} columns={columns} loading={loading} empty="No categories yet."
        defaultSort={{ field: 'sortOrder', sort: 'asc' }}
        onRowClick={({ row }) => open(row)} sx={{ '& .MuiDataGrid-row': { cursor: 'pointer' } }}
      />
      <Dialog open={!!editing} onClose={() => setEditing(null)} fullWidth maxWidth="sm">
        <Box component="form" onSubmit={async (e) => { e.preventDefault(); if (await onSave(values, current)) setEditing(null); }}>
          <DialogTitle>{current ? 'Change category' : 'Add category'}</DialogTitle>
          <DialogContent>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            <Stack spacing={2} sx={{ pt: 1 }}>
              <TextField label="Name (Swedish)" required autoFocus {...text('nameSv')} />
              <TextField label="Name (English)" {...text('nameEn')} />
              <TextField label="Order" slotProps={{ htmlInput: { inputMode: 'numeric' } }} {...text('sortOrder')} />
            </Stack>
          </DialogContent>
          <DialogActions>
            {current && (
              <Button color="error" sx={{ mr: 'auto' }} disabled={busy || usage(current._id) > 0}
                title={usage(current._id) > 0 ? 'In use' : undefined}
                onClick={() => { onDelete(current); setEditing(null); }}>Delete</Button>
            )}
            <Button onClick={() => setEditing(null)}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={busy}>{current ? 'Save' : 'Add'}</Button>
          </DialogActions>
        </Box>
      </Dialog>
    </Box>
  );
};
