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
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { ImageField } from '../components/ImageField';
import { PageTabs, TabPanel } from '../components/PageTabs';
import { ReferenceKind } from '../components/ReferenceKind';
import { workshopPath } from '../workshops/paths';
import { groupPath } from '../groups/paths';
import { spacePath } from './paths';

const Section = ({ title, children }) => (
  <Box component="section">
    <Typography variant="h6" component="h2" sx={{ mb: 1 }}>{title}</Typography>
    {children}
  </Box>
);

const TABS = [['details', 'Details'], ['icon', 'Icon'], ['references', 'References']];

const primary = (link) => link.isPrimary && <Chip size="small" label="Primary space" />;

/**
 * Add a space, or show and edit one in tabs: its details (saved with
 * Save), its map icon, and what refers to it (the workshops and groups that
 * have it as a space). Every tab stays put while another shows.
 *
 * @param {{ isNew: boolean, space?: object, values: object, onChange: (field, value) => void,
 *           onSave: () => void, busy?: boolean, error?: string, notice?: string,
 *           iconUrl?: string, onUploadIcon?: (file) => void, onRemoveIcon?: () => void, uploading?: boolean,
 *           links?: { workshops: object[], groups: object[] }, onDelete?: () => void,
 *           tab?: string, onTab?: (tab) => void }} props
 */
export const SpaceForm = ({
  isNew, space, values, onChange, onSave, busy = false, error, notice,
  iconUrl, onUploadIcon, onRemoveIcon, uploading = false, links, onDelete, tab = 'details', onTab,
}) => {
  const shown = TABS.some(([t]) => t === tab) ? tab : 'details';
  const [confirming, setConfirming] = useState(false);
  const text = (name) => ({ value: values[name], onChange: (e) => onChange(name, e.target.value) });
  const title = [space?.name?.sv, space?.name?.en].filter(Boolean).join(' / ');
  const linked = links && (links.workshops.length + links.groups.length) > 0;
  const blocked = space?.iconFileId || linked;
  const form = (
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
  );
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
          This space can not be deleted while {[linked && 'a workshop or group refers to it (see References)', space?.iconFileId && 'it has an icon'].filter(Boolean).join(' and ')}.
        </Alert>
      )}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {notice && <Alert severity="success" sx={{ mb: 2 }}>{notice}</Alert>}

      {isNew ? form : (
        <>
          <PageTabs
            tabs={TABS.map(([value, label]) => ({ value, label, count: value === 'references' && links ? links.workshops.length + links.groups.length : undefined }))}
            value={shown} onChange={onTab} href={(t) => spacePath(space._id, t)} />
          <TabPanel value="details" shown={shown} label="Details">{form}</TabPanel>
          <TabPanel value="icon" shown={shown} label="Icon">
            <Section title="Icon">
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>Shown on the map, centred on the space&apos;s marker. SVG or PNG.</Typography>
              <ImageField
                noun="icon" src={iconUrl} alt={space?.name?.sv} accept="image/svg+xml,image/png" maxSize={120}
                onUpload={onUploadIcon} onRemove={onRemoveIcon} uploading={uploading}
              />
            </Section>
          </TabPanel>
          <TabPanel value="references" shown={shown} label="References">
            <Section title="Refers to this space">
              {!links ? <Typography variant="body2">Looking…</Typography> : !linked
                ? <Typography variant="body2" color="text.secondary">No workshops or groups have this space.</Typography>
                : <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>While anything here refers to it, the space can not be deleted.</Typography>}
              {links && (
                <>
                  <ReferenceKind title="Workshops and areas of interest" items={links.workshops} render={(w) => <><Link href={workshopPath(w._id)}>{w.name?.sv || w._id}</Link>{primary(w)}</>} />
                  <ReferenceKind title="Groups" items={links.groups} render={(g) => <><Link href={groupPath(g._id)}>{g.name?.sv || g._id}</Link>{primary(g)}</>} />
                </>
              )}
            </Section>
          </TabPanel>
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
