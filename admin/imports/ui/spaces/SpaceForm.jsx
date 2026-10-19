import React, { useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import Link from '@mui/material/Link';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { ImageField } from '../components/ImageField';

const Section = ({ title, children }) => (
  <Box component="section" sx={{ mt: 4 }}>
    <Typography variant="h6" component="h2" sx={{ mb: 1 }}>{title}</Typography>
    {children}
  </Box>
);

/**
 * Add a space, or show and edit one: its fields, map icon and what links to it.
 *
 * @param {{ isNew: boolean, space?: object, values: object, onChange: (field, value) => void,
 *           onSave: () => void, busy?: boolean, error?: string, notice?: string,
 *           iconUrl?: string, onUploadIcon?: (file) => void, onRemoveIcon?: () => void, uploading?: boolean,
 *           links?: { workshops: object[], groups: object[] }, onDelete?: () => void }} props
 */
export const SpaceForm = ({
  isNew, space, values, onChange, onSave, busy = false, error, notice,
  iconUrl, onUploadIcon, onRemoveIcon, uploading = false, links, onDelete,
}) => {
  const [confirming, setConfirming] = useState(false);
  const text = (name) => ({ value: values[name], onChange: (e) => onChange(name, e.target.value) });
  const title = [space?.name?.sv, space?.name?.en].filter(Boolean).join(' / ');
  const linked = links && (links.workshops.length + links.groups.length) > 0;
  const blocked = space?.iconFileId || linked;
  return (
    <Box sx={{ maxWidth: 900 }}>
      <Link href="/spaces" underline="hover" variant="body2">← Spaces</Link>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mt: 0.5, mb: 2 }}>
        <Typography variant="h4" component="h1">{isNew ? 'Add space' : `Space: ${title}`}</Typography>
        {!isNew && links && !blocked && <Button color="error" variant="outlined" onClick={() => setConfirming(true)}>Delete</Button>}
      </Stack>
      {isNew && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          The map key must match the floor plan&apos;s SVG elements (<code>&lt;key&gt;-marker</code>, <code>&lt;key&gt;-floor</code>).
          The map icon is uploaded on the space&apos;s page once it exists.
        </Typography>
      )}
      {!isNew && links && blocked && (
        <Alert severity="info" sx={{ mb: 2 }}>
          This space can not be deleted while {[linked && 'a workshop or group links to it', space?.iconFileId && 'it has an icon'].filter(Boolean).join(' and ')}.
          Remove {[linked && 'the links', space?.iconFileId && 'the icon'].filter(Boolean).join(' and ')} first.
        </Alert>
      )}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {notice && <Alert severity="success" sx={{ mb: 2 }}>{notice}</Alert>}

      <Box component="form" onSubmit={(e) => { e.preventDefault(); onSave(); }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
          <TextField label="Space id (map key)" required sx={{ minWidth: 240 }} {...text('spaceId')} />
          <TextField label="Floor" select sx={{ minWidth: 160 }} slotProps={{ select: { native: true }, inputLabel: { shrink: true } }} {...text('floor')}>
            <option value="floor1">Floor 1</option>
            <option value="floor2">Floor 2</option>
          </TextField>
        </Stack>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
          <TextField label="Name (Swedish)" required fullWidth {...text('nameSv')} />
          <TextField label="Name (English)" fullWidth {...text('nameEn')} />
        </Stack>
        <Stack spacing={2} sx={{ mb: 2 }}>
          <TextField label="Description (Swedish)" multiline minRows={2} fullWidth {...text('descriptionSv')} />
          <TextField label="Description (English)" multiline minRows={2} fullWidth {...text('descriptionEn')} />
        </Stack>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
          <TextField label="Slack channels (comma separated)" placeholder="#träverkstaden, #cnc" fullWidth {...text('slackChannels')} />
          <TextField label="Icon size" type="number" sx={{ minWidth: 140 }} {...text('iconSize')} />
        </Stack>
        <Stack direction="row" spacing={1}>
          <Button type="submit" variant="contained" disabled={busy}>{isNew ? 'Add space' : 'Save'}</Button>
          <Button href="/spaces">{isNew ? 'Cancel' : 'Back'}</Button>
        </Stack>
      </Box>

      {!isNew && (
        <>
          <Section title="Icon">
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>Shown on the map, centred on the space&apos;s marker. SVG or PNG.</Typography>
            <ImageField
              noun="icon" src={iconUrl} alt={space?.name?.sv} accept="image/svg+xml,image/png" maxSize={120}
              onUpload={onUploadIcon} onRemove={onRemoveIcon} uploading={uploading}
            />
          </Section>
          <Section title="Linked from">
            {!links ? <Typography variant="body2">Looking…</Typography> : !linked
              ? <Typography variant="body2" color="text.secondary">No workshops or groups link to this space.</Typography>
              : (
                <List dense disablePadding>
                  {[...links.workshops.map((w) => ({ ...w, kind: 'workshop', href: `/workshop/${w._id}` })),
                    ...links.groups.map((g) => ({ ...g, kind: 'group', href: `/group/${g._id}` }))].map((link) => (
                      <ListItem key={link._id} disableGutters>
                        <Link href={link.href}>{link.name?.sv || link._id}</Link>
                        <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>({link.kind}{link.isPrimary ? ', primary' : ''})</Typography>
                      </ListItem>
                  ))}
                </List>
              )}
          </Section>
        </>
      )}

      <Dialog open={confirming} onClose={() => setConfirming(false)}>
        <DialogTitle>Delete this space?</DialogTitle>
        <DialogContent><DialogContentText>“{title}” is removed from the map for good.</DialogContentText></DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirming(false)}>Cancel</Button>
          <Button color="error" variant="contained" disabled={busy} onClick={() => { setConfirming(false); onDelete(); }}>Delete</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
