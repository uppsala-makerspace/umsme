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
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { DateField } from '../components/DateField';
import { ImageField } from '../components/ImageField';
import { MemberChips } from '../components/MemberChips';
import { FORM_WIDTH, PageTabs, TabPanel, TabToolbar } from '../components/PageTabs';
import { memberPath } from '../members/paths';
import { dateTime } from '../dates';
import { SharedFields, native } from './SharedFields';
import { RegistrationFields, checkInShown } from './RegistrationFields';
import { StatusChip } from './eventColumns';
import { activityPath, eventPath } from './paths';
import { eventName, parseClock } from '/imports/common/lib/activityValues';

const TABS = [['details', 'Details'], ['participants', 'Participants'], ['image', 'Image']];

/** A time of day, HH:MM, typed by hand. */
const ClockField = ({ label, value, onChange, helperText, ...props }) => {
  const wrong = parseClock(value) === null;
  return (
    <TextField label={label} value={value} onChange={(e) => onChange(e.target.value)} placeholder="18:00"
      error={wrong} helperText={wrong ? 'A time, like 18:00' : helperText}
      slotProps={{ htmlInput: { inputMode: 'numeric' }, inputLabel: { shrink: true } }} {...props} />
  );
};

/**
 * Add an event, or show and edit one in tabs: its details (saved with Save)
 * and its image. An event of an activity takes what it leaves empty from the
 * activity (`activity`), which the fields show greyed; a free-standing one
 * has its own name and group.
 *
 * @param {{ isNew: boolean, event?: object, activity?: object|null, values: object,
 *           onChange: (field, value) => void, onSave: () => void, busy?: boolean, error?: string, notice?: string,
 *           activities: Array<{ _id, name, groupId }>, groups: Array<{ _id, name }>, categories: Array<{ _id, name }>,
 *           workshopOptions: Array<{ value, label }>, spaceOptions: Array<{ value, label }>, groupName: (id) => string,
 *           hosts: Array<{ _id, name, mid }>, onAddHost: (member) => void, onRemoveHost: (memberId) => void,
 *           searchMembers: (query) => Promise<object[]>,
 *           imageUrl?: string, ownImage?: boolean, onUploadImage?: (file) => void, onRemoveImage?: () => void,
 *           uploading?: boolean, onDelete?: () => void, tab?: string, onTab?: (tab) => void,
 *           participants?: React.ReactNode, participantCount?: number }} props
 *   `participants` is the Participants tab's content (Participants, from the page).
 *   `imageUrl` is the image shown, the event's or its activity's; `ownImage` whether it is the event's.
 */
export const EventForm = ({
  isNew, event, activity = null, values, onChange, onSave, busy = false, error, notice, activities, groups, categories, certificates = [],
  workshopOptions, spaceOptions, groupName, hosts, onAddHost, onRemoveHost, searchMembers,
  imageUrl, ownImage = false, onUploadImage, onRemoveImage, uploading = false, onDelete, tab = 'details', onTab,
  participants = null, participantCount,
}) => {
  const shown = TABS.some(([t]) => t === tab) ? tab : 'details';
  const [confirming, setConfirming] = useState(false);
  const saved = event ? activities.find((a) => a._id === event.activityId) || null : null;
  const name = eventName(event, saved);
  const back = event?.activityId || (isNew && values.activityId)
    ? { href: activityPath(event?.activityId || values.activityId, 'events'), label: 'The activity' }
    : { href: '/events', label: 'Events' };
  const groupId = activity ? activity.groupId : values.groupId;

  const form = (
    <Box component="form" onSubmit={(e) => { e.preventDefault(); onSave(); }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
        <TextField label="Activity" select fullWidth slotProps={native} value={values.activityId} onChange={(e) => onChange('activityId', e.target.value)}>
          <option value="">(None: a free-standing event)</option>
          {activities.map((a) => <option key={a._id} value={a._id}>{a.name?.sv || a._id}</option>)}
        </TextField>
        {values.activityId ? (
          <TextField label="Group" fullWidth disabled value={activity?.groupId ? groupName(activity.groupId) || '' : 'The association'}
            helperText="The activity's" />
        ) : (
          <TextField label="Owning group" select fullWidth slotProps={native} value={values.groupId} onChange={(e) => onChange('groupId', e.target.value)}
            helperText="Any active member of it may change the event.">
            <option value="">(The association: board and admin only)</option>
            {groups.map((g) => <option key={g._id} value={g._id}>{g.name?.sv || g._id}</option>)}
          </TextField>
        )}
      </Stack>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
        <DateField label="Day" required value={values.startDay} onChange={(v) => onChange('startDay', v)} />
        <ClockField label="Starts" required value={values.startTime} onChange={(v) => onChange('startTime', v)} />
        <ClockField label="Ends" value={values.endTime} onChange={(v) => onChange('endTime', v)}
          helperText="Empty: counted from the duration" />
        <DateField label="End day" value={values.endDay} onChange={(v) => onChange('endDay', v)}
          helperText="Empty: the same day" />
      </Stack>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
        <TextField label="Status" select slotProps={native} sx={{ minWidth: 220 }} value={values.status} onChange={(e) => onChange('status', e.target.value)}>
          {/* Awaiting or confirmed follows from the registrations; only calling off is a choice. */}
          {values.status === 'awaiting' && <option value="awaiting">Awaiting participants</option>}
          <option value="confirmed">Confirmed</option>
          <option value="cancelled">Cancelled</option>
        </TextField>
      </Stack>
      <Box sx={{ mb: 2 }}>
        <MemberChips
          label="Hosts" members={hosts} onAdd={onAddHost} onRemove={onRemoveHost} search={searchMembers}
          href={(m) => memberPath(m._id)} empty="No hosts yet."
          helperText={groupId ? `Members of ${groupName(groupId) || 'the group'} may host; board and admin may choose anyone.` : 'Board and admin may choose anyone.'}
        />
      </Box>
      <SharedFields
        event values={values} onChange={onChange} inherited={values.activityId ? activity : null}
        categories={categories} workshopOptions={workshopOptions} spaceOptions={spaceOptions}
      />
      <RegistrationFields event values={values} onChange={onChange} inherited={values.activityId ? activity : null} certificates={certificates} />
      {checkInShown(values, values.activityId ? activity : null) && (
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
          <DateField label="Check-in deadline, day" value={values.checkInDeadlineDay} onChange={(v) => onChange('checkInDeadlineDay', v)}
            helperText="Empty: the event's day" />
          <ClockField label="Check-in deadline, time" value={values.checkInDeadlineTime} onChange={(v) => onChange('checkInDeadlineTime', v)}
            helperText="Empty: check-in closes at the start" />
        </Stack>
      )}
      <Stack direction="row" spacing={1}>
        <Button type="submit" variant="contained" disabled={busy}>{isNew ? 'Add' : 'Save'}</Button>
        <Button href={back.href}>{isNew ? 'Cancel' : 'Back'}</Button>
      </Stack>
    </Box>
  );

  return (
    <Box>
      <Link href={back.href} underline="hover" variant="body2">← {back.label}</Link>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mt: 0.5, mb: 2 }}>
        <Typography variant="h4" component="h1">
          {isNew ? 'Add event' : `Event: ${name}, ${dateTime(event.start)}`}
          {event && <Box component="span" sx={{ ml: 1, verticalAlign: 'middle' }}><StatusChip status={event.status} /></Box>}
        </Typography>
        {!isNew && <Button color="error" variant="outlined" onClick={() => setConfirming(true)}>Delete event</Button>}
      </Stack>
      {isNew && values.activityId && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          What you leave empty is the activity’s, as shown greyed. The image is uploaded on the page once the event exists.
        </Typography>
      )}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {notice && <Alert severity="success" sx={{ mb: 2 }}>{notice}</Alert>}

      {isNew ? <Box sx={{ maxWidth: FORM_WIDTH }}>{form}</Box> : (
        <>
          <PageTabs
            tabs={TABS.map(([value, label]) => ({ value, label, count: value === 'participants' ? participantCount : undefined }))}
            value={shown} onChange={onTab} href={(t) => eventPath(event._id, t)} />
          <TabPanel value="details" shown={shown} label="Details" form>{form}</TabPanel>
          <TabPanel value="participants" shown={shown} label="Participants">{participants}</TabPanel>
          <TabPanel value="image" shown={shown} label="Image" form>
            <>
              <TabToolbar note={ownImage || !imageUrl ? 'An event of an activity shows the activity’s image unless it has one of its own.' : 'This is the activity’s image; upload one to give the event its own.'} />
              <ImageField
                src={imageUrl} alt={name} accept="image/jpeg,image/png,image/webp,image/heic"
                onUpload={onUploadImage} onRemove={ownImage ? onRemoveImage : undefined} uploading={uploading}
              />
            </>
          </TabPanel>
        </>
      )}

      <Dialog open={confirming} onClose={() => setConfirming(false)}>
        <DialogTitle>Delete this event?</DialogTitle>
        <DialogContent><DialogContentText>“{name}” on {dateTime(event?.start)} is deleted for good, its image with it. To call it off but keep it, set its status to cancelled.</DialogContentText></DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirming(false)}>Cancel</Button>
          <Button color="error" variant="contained" disabled={busy} onClick={() => { setConfirming(false); onDelete(); }}>Delete</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
