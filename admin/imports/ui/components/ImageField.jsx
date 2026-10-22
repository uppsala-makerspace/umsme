import React, { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

/**
 * An image of an item (a store item's picture, a space's map icon): shows it,
 * uploads a new one, removes it after asking. `noun` names it in the buttons:
 * "Upload image", "Remove icon".
 *
 * @param {{ noun?: string, src?: string, alt: string, accept: string, onUpload: (file) => void,
 *           onRemove: () => void, uploading?: boolean, maxSize?: number }} props
 */
export const ImageField = ({ noun = 'image', src, alt, accept, onUpload, onRemove, uploading = false, maxSize = 400 }) => {
  const [file, setFile] = useState(null);
  const [confirming, setConfirming] = useState(false);
  return (
    <Box>
      {src
        ? <Box component="img" src={src} alt={alt} sx={{ display: 'block', maxWidth: maxSize, maxHeight: maxSize * 0.75, mb: 1, borderRadius: 1 }} />
        : <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>No {noun} uploaded.</Typography>}
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
        <Button component="label" variant="outlined">
          Choose {noun}
          <input type="file" style={{ display: 'none' }} accept={accept} onChange={(e) => setFile(e.target.files?.[0] || null)} />
        </Button>
        <Typography variant="body2" color="text.secondary">{file?.name}</Typography>
        <Button variant="contained" disabled={!file || uploading} onClick={() => { onUpload(file); setFile(null); }}>
          {uploading ? 'Uploading…' : `Upload ${noun}`}
        </Button>
        {src && <Button onClick={() => setConfirming(true)}>Remove {noun}</Button>}
      </Stack>
      <Dialog open={confirming} onClose={() => setConfirming(false)}>
        <DialogTitle>Remove the {noun}?</DialogTitle>
        <DialogContent><DialogContentText>The {noun} is removed, here and from storage.</DialogContentText></DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirming(false)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={() => { setConfirming(false); onRemove(); }}>Remove {noun}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
