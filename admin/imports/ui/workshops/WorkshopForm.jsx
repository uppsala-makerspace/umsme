import React, { useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
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
import { workshopCompleteness, isAreaOfInterest } from '/imports/common/lib/groupRules';
import { ChipSelect } from '../components/ChipSelect';
import { ImageField } from '../components/ImageField';
import { Section } from '../components/Section';
import { PageTabs, TabPanel } from '../components/PageTabs';
import { workshopPath } from './paths';
import { KINDS, STATUSES, MISSING } from './labels';

const native = { select: { native: true }, inputLabel: { shrink: true } };
const TABS = [['details', 'Details'], ['image', 'Image'], ['references', 'References']];

/**
 * Add a workshop or area of interest, or show and edit one in tabs: its
 * details (fields, steering group and spaces, saved with Save), its image,
 * and what refers to it (the certificates that belong to it). Every tab
 * stays put while another shows, so unsaved details survive.
 *
 * @param {{ isNew: boolean, workshop?: object, values: object, onChange: (field, value) => void,
 *           onSave: () => void, busy?: boolean, error?: string, notice?: string,
 *           groups: Array<{ _id, name }>, spaceOptions: Array<{ value, label, group }>,
 *           details?: { activeMemberCount: number, certificates: object[] },
 *           imageUrl?: string, onUploadImage?: (file) => void, onRemoveImage?: () => void,
 *           uploading?: boolean, onDelete?: () => void, tab?: string, onTab?: (tab) => void }} props
 *   `groups` are the steering groups; `details` is about the saved workshop.
 */
export const WorkshopForm = ({
  isNew, workshop, values, onChange, onSave, busy = false, error, notice, groups, spaceOptions,
  details, imageUrl, onUploadImage, onRemoveImage, uploading = false, onDelete, tab = 'details', onTab,
}) => {
  const shown = TABS.some(([t]) => t === tab) ? tab : 'details';
  const [confirming, setConfirming] = useState(false);
  const text = (name) => ({ value: values[name], onChange: (e) => onChange(name, e.target.value) });
  const area = isAreaOfInterest(workshop);
  const noun = area ? 'area of interest' : 'workshop';
  const title = [workshop?.name?.sv, workshop?.name?.en].filter(Boolean).join(' / ');
  const savedGroup = groups.find((g) => g._id === workshop?.groupId) || null;
  const completeness = workshop && details
    ? workshopCompleteness(workshop, savedGroup, details.activeMemberCount)
    : null;
  const selectedGroup = groups.find((g) => g._id === values.groupId);
  const blocked = workshop?.imageFileId || details?.certificates.length > 0;
  const form = (
    <Box component="form" onSubmit={(e) => { e.preventDefault(); onSave(); }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
        <TextField label="Kind" select sx={{ minWidth: 280 }} slotProps={native} {...text('kind')}>
          {KINDS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </TextField>
        <TextField label="Status" select sx={{ minWidth: 280 }} slotProps={native} {...text('status')}>
          {STATUSES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </TextField>
      </Stack>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
        <TextField label="Name (Swedish)" required fullWidth {...text('nameSv')} />
        <TextField label="Name (English)" fullWidth {...text('nameEn')} />
      </Stack>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
        <TextField label="Tag (Swedish)" fullWidth helperText="Short label on the public website" {...text('tagSv')} />
        <TextField label="Tag (English)" fullWidth {...text('tagEn')} />
      </Stack>
      <Stack spacing={2} sx={{ mb: 2 }}>
        <TextField label="Description (Swedish, markdown)" multiline minRows={4} fullWidth {...text('descriptionSv')} />
        <TextField label="Description (English, markdown)" multiline minRows={4} fullWidth {...text('descriptionEn')} />
        <TextField label="Rules (Swedish, markdown)" multiline minRows={3} fullWidth {...text('rulesSv')} />
        <TextField label="Rules (English, markdown)" multiline minRows={3} fullWidth {...text('rulesEn')} />
      </Stack>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
        <TextField label="Slack channel" fullWidth {...text('slackChannel')} />
        <TextField label="Guides URL" fullWidth {...text('guidesUrl')} />
      </Stack>
      <Box sx={{ mb: 2 }}>
        <TextField label="Steering group" select fullWidth slotProps={native} {...text('groupId')}
          helperText={values.kind === 'areaOfInterest'
            ? 'Runs the area of interest; it needs at least one active member.'
            : 'Cares for the workshop; it needs at least two active members.'}>
          <option value="">(No steering group)</option>
          {groups.map((g) => <option key={g._id} value={g._id}>{g.name?.sv || g._id}</option>)}
        </TextField>
        {selectedGroup && (
          <Typography variant="body2" sx={{ mt: 0.5 }}>
            <Link href={`/group/${selectedGroup._id}`}>Open {selectedGroup.name?.sv}</Link>
            {details && selectedGroup._id === workshop?.groupId && ` (${details.activeMemberCount} active members)`}
          </Typography>
        )}
      </Box>
      <Stack spacing={2} sx={{ mb: 2 }}>
        <TextField label="Primary space" select fullWidth slotProps={native} {...text('primarySpaceId')}>
          <option value="">(No primary space)</option>
          {spaceOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </TextField>
        <ChipSelect
          label="Secondary spaces"
          options={spaceOptions.filter((o) => o.value !== values.primarySpaceId)}
          value={values.secondarySpaceIds.filter((id) => id !== values.primarySpaceId)}
          onChange={(ids) => onChange('secondarySpaceIds', ids)}
        />
      </Stack>
      <Stack direction="row" spacing={1}>
        <Button type="submit" variant="contained" disabled={busy}>{isNew ? 'Add' : 'Save'}</Button>
        <Button href="/workshops">{isNew ? 'Cancel' : 'Back'}</Button>
      </Stack>
    </Box>
  );

  return (
    <Box sx={{ maxWidth: 900 }}>
      <Link href="/workshops" underline="hover" variant="body2">← Workshops &amp; areas of interest</Link>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mt: 0.5, mb: 2 }}>
        <Typography variant="h4" component="h1">
          {isNew ? 'Add workshop or area of interest' : `${area ? 'Area of interest' : 'Workshop'}: ${title}`}
          {completeness && (
            <Chip size="small" sx={{ ml: 1, verticalAlign: 'middle' }}
              color={completeness.complete ? 'success' : 'warning'}
              label={completeness.complete ? 'Complete' : 'Incomplete'} />
          )}
        </Typography>
        {!isNew && details && !blocked && <Button color="error" variant="outlined" onClick={() => setConfirming(true)}>Delete {noun}</Button>}
      </Stack>
      {isNew && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          An area of interest (intresseområde) is coordinated around an interest that may span several workshops; it has
          lighter requirements than a workshop. The Swedish name of a workshop should end in <em>verkstad</em> or
          {' '}<em>verkstaden</em>. The image is uploaded on the page once it exists.
        </Typography>
      )}
      {completeness && !completeness.complete && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Missing per the guideline: {completeness.missing.map((key) => MISSING[key] || key).join(', ')}.
        </Alert>
      )}
      {completeness?.warnings.includes('nameSuffix') && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          The Swedish name should end in <em>verkstad</em> or <em>verkstaden</em> (e.g. Träverkstad, Träverkstaden).
        </Alert>
      )}
      {!isNew && details && blocked && (
        <Alert severity="info" sx={{ mb: 2 }}>
          This {noun} can not be deleted while {[workshop.imageFileId && 'it has an image', details.certificates.length > 0 && 'certificates belong to it'].filter(Boolean).join(' and ')}.
          Remove {[workshop.imageFileId && 'the image', details.certificates.length > 0 && 'the certificates'].filter(Boolean).join(' and ')} first.
        </Alert>
      )}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {notice && <Alert severity="success" sx={{ mb: 2 }}>{notice}</Alert>}

      {isNew ? form : (
        <>
          <PageTabs
            tabs={TABS.map(([value, label]) => ({ value, label, count: value === 'references' && details ? details.certificates.length : undefined }))}
            value={shown} onChange={onTab} href={(t) => workshopPath(workshop._id, t)} />
          <TabPanel value="details" shown={shown} label="Details">{form}</TabPanel>
          <TabPanel value="image" shown={shown} label="Image">
            <Section sx={{ mt: 0 }} title="Image" note="A representative image is required by the guideline.">
              <ImageField
                src={imageUrl} alt={workshop?.name?.sv} accept="image/jpeg,image/png,image/webp,image/heic"
                onUpload={onUploadImage} onRemove={onRemoveImage} uploading={uploading}
              />
            </Section>
          </TabPanel>
          <TabPanel value="references" shown={shown} label="References">
            <Section sx={{ mt: 0 }} title="Certificates" note="The certificates that belong to it; each is linked from the certificate’s own page.">
              {!details ? <Typography variant="body2">Looking…</Typography> : details.certificates.length === 0
                ? (
                  <Typography variant="body2" color="text.secondary">
                    No certificates belong to this {noun}. Link them from each certificate&apos;s page
                    under <Link href="/certificates">Certificates</Link>.
                  </Typography>
                )
                : (
                  <List dense disablePadding>
                    {details.certificates.map((c) => (
                      <ListItem key={c._id} disableGutters><Link href={`/certificate/${c._id}`}>{c.name?.sv || c._id}</Link></ListItem>
                    ))}
                  </List>
                )}
            </Section>
          </TabPanel>
        </>
      )}

      <Dialog open={confirming} onClose={() => setConfirming(false)}>
        <DialogTitle>Delete this {noun}?</DialogTitle>
        <DialogContent><DialogContentText>“{title}” is deleted for good.</DialogContentText></DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirming(false)}>Cancel</Button>
          <Button color="error" variant="contained" disabled={busy} onClick={() => { setConfirming(false); onDelete(); }}>Delete</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
