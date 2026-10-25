import React, { useEffect, useState } from 'react';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import FormControlLabel from '@mui/material/FormControlLabel';
import Stack from '@mui/material/Stack';
import { dateTime } from '../dates';

/**
 * The free-standing events with the activity's name, such as those imported
 * from the calendar before it existed, to take in as its events: all chosen
 * to begin with.
 *
 * @param {{ open: boolean, name: string, events: Array<{ _id, name, start, status }>|null,
 *           onLink: (ids: string[]) => void, onClose: () => void, busy?: boolean }} props
 *   `events` is null while they are being looked for.
 */
export const MatchingEvents = ({ open, name, events, onLink, onClose, busy = false }) => {
  const [chosen, setChosen] = useState([]);
  useEffect(() => { setChosen((events || []).map((e) => e._id)); }, [events]);
  const toggle = (id, on) => setChosen((c) => (on ? [...c, id] : c.filter((x) => x !== id)));
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Events named “{name}”</DialogTitle>
      <DialogContent>
        {events === null ? <DialogContentText>Looking…</DialogContentText>
          : events.length === 0 ? <DialogContentText>No free-standing event has the activity’s name.</DialogContentText>
            : (
              <>
                <DialogContentText sx={{ mb: 1 }}>
                  Free-standing events with the activity’s name. The chosen become its events: they take its group, and
                  what they say as it does is left to it.
                </DialogContentText>
                <Stack>
                  {events.map((e) => (
                    <FormControlLabel key={e._id}
                      control={<Checkbox checked={chosen.includes(e._id)} onChange={(ev) => toggle(e._id, ev.target.checked)} />}
                      label={`${dateTime(e.start)} ${e.name?.sv || e.name?.en || ''}${e.status === 'cancelled' ? ' (cancelled)' : ''}`} />
                  ))}
                </Stack>
              </>
            )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" disabled={busy || chosen.length === 0} onClick={() => onLink(chosen)}>
          Make {chosen.length || ''} its events
        </Button>
      </DialogActions>
    </Dialog>
  );
};
