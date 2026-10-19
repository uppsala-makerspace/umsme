import React, { useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

const day = (date) => (date ? new Date(date).toLocaleDateString('sv-SE') : '');

/** Write or rewrite a comment. */
const Editor = ({ initial = '', label, onSave, onCancel, busy }) => {
  const [text, setText] = useState(initial);
  return (
    <Box component="form" onSubmit={(e) => { e.preventDefault(); onSave(text.trim()); }}>
      <TextField label={label} multiline minRows={2} fullWidth autoFocus value={text} onChange={(e) => setText(e.target.value)} />
      <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
        <Button type="submit" size="small" variant="contained" disabled={busy || !text.trim()}>Save comment</Button>
        <Button size="small" onClick={onCancel}>Cancel</Button>
      </Stack>
    </Box>
  );
};

/**
 * The comments about something: newest first, each editable and removable,
 * and a new one. Each change takes effect at once.
 *
 * @param {{ comments: object[], onAdd: (text) => Promise<boolean>, onUpdate: (id, text) => Promise<boolean>,
 *           onRemove: (id) => void, busy?: boolean, error?: string }} props
 */
export const CommentsSection = ({ comments, onAdd, onUpdate, onRemove, busy = false, error }) => {
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(null);
  return (
    <Box component="section" aria-label="Comments" sx={{ mt: 4 }}>
      <Stack direction="row" spacing={2} sx={{ alignItems: 'center', mb: 1 }}>
        <Typography variant="h5" component="h2">Comments</Typography>
        {!adding && <Button size="small" variant="outlined" onClick={() => setAdding(true)}>Add comment</Button>}
      </Stack>
      {error && <Alert severity="error" sx={{ mb: 1 }}>{error}</Alert>}
      {adding && (
        <Paper variant="outlined" sx={{ p: 1.5, mb: 1.5 }}>
          <Editor label="New comment" busy={busy} onCancel={() => setAdding(false)} onSave={async (text) => { if (await onAdd(text)) setAdding(false); }} />
        </Paper>
      )}
      {comments.length === 0 && !adding && <Typography variant="body2" color="text.secondary">No comments.</Typography>}
      <Stack spacing={1}>
        {comments.map((c) => (
          <Paper key={c._id} component="article" variant="outlined" sx={{ p: 1.5 }} aria-label={`Comment from ${day(c.created)}`}>
            {editing === c._id
              ? <Editor label="Comment" initial={c.text || ''} busy={busy} onCancel={() => setEditing(null)} onSave={async (text) => { if (await onUpdate(c._id, text)) setEditing(null); }} />
              : (
                <>
                  <Typography sx={{ whiteSpace: 'pre-wrap' }}>{c.text || <em>Empty</em>}</Typography>
                  <Stack direction="row" spacing={1} sx={{ mt: 0.5, alignItems: 'center' }}>
                    <Typography variant="caption" color="text.secondary">
                      Created {day(c.created)}{c.modified ? ` · modified ${day(c.modified)}` : ''}
                    </Typography>
                    <Button size="small" onClick={() => setEditing(c._id)}>Edit</Button>
                    <Button size="small" color="error" disabled={busy} onClick={() => onRemove(c._id)}>Delete</Button>
                  </Stack>
                </>
              )}
          </Paper>
        ))}
      </Stack>
    </Box>
  );
};
