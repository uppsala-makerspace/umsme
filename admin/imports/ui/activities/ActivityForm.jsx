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
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { DataList } from '../components/DataList';
import { ImageField } from '../components/ImageField';
import { FORM_WIDTH, PageTabs, TabPanel, TabToolbar } from '../components/PageTabs';
import { SharedFields, native } from './SharedFields';
import { RegistrationFields } from './RegistrationFields';
import { MatchingEvents } from './MatchingEvents';
import { eventColumns } from './eventColumns';
import { activityPath, addEventPath, eventPath } from './paths';

const TABS = [['details', 'Details'], ['image', 'Image'], ['events', 'Events']];

/**
 * Add an activity, or show and edit one in tabs: its details (saved with
 * Save), its image, and its events, with a button for one more. Every tab
 * stays put while another shows, so unsaved details survive.
 *
 * @param {{ isNew: boolean, activity?: object, events?: object[], values: object,
 *           onChange: (field, value) => void, onSave: () => void, busy?: boolean, error?: string, notice?: string,
 *           groups: Array<{ _id, name }>, categories: Array<{ _id, name }>, certificates?: Array<{ _id, name }>,
 *           workshopOptions: Array<{ value, label }>, spaceOptions: Array<{ value, label }>,
 *           groupName: (id) => string, imageUrl?: string, onUploadImage?: (file) => void,
 *           onRemoveImage?: () => void, uploading?: boolean, onDelete?: () => void,
 *           tab?: string, onTab?: (tab) => void, interestCount?: number,
 *           matching?: null|'loading'|object[], onFindMatching?: () => void, onLinkMatching?: (ids) => void,
 *           onCloseMatching?: () => void }} props
 *   `matching` are the free-standing events with its name: null when not looked for.
 */
export const ActivityForm = ({
  isNew, activity, events = [], values, onChange, onSave, busy = false, error, notice, groups, categories, certificates = [],
  workshopOptions, spaceOptions, groupName, imageUrl, onUploadImage, onRemoveImage, uploading = false, onDelete,
  tab = 'details', onTab, interestCount, matching = null, onFindMatching, onLinkMatching, onCloseMatching,
}) => {
  const shown = TABS.some(([t]) => t === tab) ? tab : 'details';
  const [confirming, setConfirming] = useState(false);
  const title = [activity?.name?.sv, activity?.name?.en].filter(Boolean).join(' / ');
  const blocked = activity?.imageFileId || events.length > 0;
  const form = (
    <Box component="form" onSubmit={(e) => { e.preventDefault(); onSave(); }}>
      <TextField label="Owning group" select fullWidth slotProps={native} sx={{ mb: 2 }}
        value={values.groupId} onChange={(e) => onChange('groupId', e.target.value)}
        helperText="Its steering group's members, or another group's responsible, may change it; any active member of the group may book its events.">
        <option value="">(The association: board and admin only)</option>
        {groups.map((g) => <option key={g._id} value={g._id}>{g.name?.sv || g._id}</option>)}
      </TextField>
      <TextField label="Who creates and changes its events" select fullWidth slotProps={native} sx={{ mb: 2 }}
        value={values.eventBookers} onChange={(e) => onChange('eventBookers', e.target.value)}>
        <option value="groupMembers">Every active member of the group</option>
        <option value="activityEditors">Those who may change the activity</option>
      </TextField>
      <SharedFields values={values} onChange={onChange} categories={categories} workshopOptions={workshopOptions} spaceOptions={spaceOptions} />
      <RegistrationFields values={values} onChange={onChange} certificates={certificates} />
      <Stack direction="row" spacing={1}>
        <Button type="submit" variant="contained" disabled={busy}>{isNew ? 'Add' : 'Save'}</Button>
        <Button href="/activities">{isNew ? 'Cancel' : 'Back'}</Button>
      </Stack>
    </Box>
  );

  return (
    <Box>
      <Link href="/activities" underline="hover" variant="body2">← Activities</Link>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mt: 0.5, mb: 2 }}>
        <Typography variant="h4" component="h1">
          {isNew ? 'Add activity' : `Activity: ${title}`}
          {activity && (
            <Chip size="small" sx={{ ml: 1, verticalAlign: 'middle' }} color={activity.published ? 'success' : 'default'}
              label={activity.published ? 'On the website' : 'Not on the website'} />
          )}
        </Typography>
        {!isNew && !blocked && <Button color="error" variant="outlined" onClick={() => setConfirming(true)}>Delete activity</Button>}
      </Stack>
      {isNew && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          An activity is something we usually do; its events are the times it happens. The image is uploaded, and
          events added, on the page once it exists.
        </Typography>
      )}
      {!isNew && blocked && (
        <Alert severity="info" sx={{ mb: 2 }}>
          This activity can not be deleted while {[activity.imageFileId && 'it has an image', events.length > 0 && 'it has events'].filter(Boolean).join(' and ')}.
        </Alert>
      )}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {notice && <Alert severity="success" sx={{ mb: 2 }}>{notice}</Alert>}

      {isNew ? <Box sx={{ maxWidth: FORM_WIDTH }}>{form}</Box> : (
        <>
          <PageTabs
            tabs={TABS.map(([value, label]) => ({ value, label, count: value === 'events' ? events.length : undefined }))}
            value={shown} onChange={onTab} href={(t) => activityPath(activity._id, t)} />
          <TabPanel value="details" shown={shown} label="Details" form>{form}</TabPanel>
          <TabPanel value="image" shown={shown} label="Image" form>
            <>
              <TabToolbar note="Shown with the activity, and with each of its events that has none of its own." />
              <ImageField
                src={imageUrl} alt={activity?.name?.sv} accept="image/jpeg,image/png,image/webp,image/heic"
                onUpload={onUploadImage} onRemove={onRemoveImage} uploading={uploading}
              />
            </>
          </TabPanel>
          <TabPanel value="events" shown={shown} label="Events">
            <>
              <TabToolbar note={`The times the activity happens. An event takes what it leaves empty from the activity.${interestCount ? ` ${interestCount} ${interestCount === 1 ? 'member is' : 'members are'} interested and told of each new one.` : ''}`}>
                {onFindMatching && <Button variant="outlined" onClick={onFindMatching}>Find events by name</Button>}
                <Button variant="contained" href={addEventPath(activity._id)}>Add event</Button>
              </TabToolbar>
              <DataList
                rows={events}
                columns={eventColumns({ activityOf: () => activity, groupName })}
                rowHref={(e) => eventPath(e._id)}
                empty="No events yet."
                defaultSort={{ field: 'start', sort: 'desc' }}
              />
            </>
          </TabPanel>
        </>
      )}

      {onFindMatching && (
        <MatchingEvents open={matching !== null} name={activity?.name?.sv} events={matching === 'loading' ? null : matching}
          onLink={onLinkMatching} onClose={onCloseMatching} busy={busy} />
      )}
      <Dialog open={confirming} onClose={() => setConfirming(false)}>
        <DialogTitle>Delete this activity?</DialogTitle>
        <DialogContent><DialogContentText>“{title}” is deleted for good.</DialogContentText></DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirming(false)}>Cancel</Button>
          <Button color="error" variant="contained" disabled={busy} onClick={() => { setConfirming(false); onDelete(); }}>Delete</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
