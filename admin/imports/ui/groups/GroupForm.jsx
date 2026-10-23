import React, { useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import FormControlLabel from '@mui/material/FormControlLabel';
import Link from '@mui/material/Link';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { groupCompleteness } from '/imports/common/lib/groupRules';
import { ChipSelect } from '../components/ChipSelect';
import { ImageField } from '../components/ImageField';
import { PageTabs, TabPanel } from '../components/PageTabs';
import { GroupReferences, referenceCount } from './GroupReferences';
import { groupPath } from './paths';
import { MemberSelect } from '../components/MemberSelect';
import { Section } from '../components/Section';
import { MISSING } from '../workshops/labels';
import { TYPES, JOIN_POLICIES } from './labels';

const native = { select: { native: true }, inputLabel: { shrink: true } };

/** A member's line in the members section: their name, and what can be done. */
const MemberItem = ({ member, children }) => (
  <ListItem disableGutters divider secondaryAction={<Stack direction="row" spacing={1}>{children}</Stack>}>
    <Link href={`/member/${member.memberId}`}>{member.name}</Link>
    {member.mid && <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>{member.mid}</Typography>}
    {member.isResponsible && <Chip size="small" color="primary" label="Responsible" sx={{ ml: 1 }} />}
  </ListItem>
);

/**
 * Add a group, or show and edit one: its fields and links to other things
 * (saved with Save), then its image, its members and their requests (each
 * takes effect at once), and what refers to it.
 *
 * @param {{ isNew: boolean, group?: object, values: object, onChange: (field, value) => void,
 *           onSave: () => void, busy?: boolean, error?: string, notice?: string,
 *           groups: Array<{ _id, name, type }>, workshopOptions: object[], spaceOptions: object[],
 *           roleOptions: Array<{ value, label }>,
 *           responsible: { _id, name, mid }|null, onResponsibleChange: (member|null) => void,
 *           searchMembers: (query) => Promise<object[]>,
 *           members?: { active: object[], pending: object[] },
 *           onAddMember?: (memberId) => void, onApprove?: (memberId) => void,
 *           onReject?: (memberId) => void, onRemoveMember?: (memberId) => void,
 *           references?: { workshop, childGroups: object[], expenseAccounts: object[], memberships: number },
 *           imageUrl?: string, onUploadImage?: (file) => void, onRemoveImage?: () => void,
 *           uploading?: boolean, onDelete?: () => void, tab?: string, onTab?: (tab) => void }} props
 *   `members` entries are { memberId, name, mid, isResponsible }.
 */
const TABS = [['details', 'Details'], ['image', 'Image'], ['members', 'Members'], ['references', 'References']];

export const GroupForm = ({
  isNew, group, values, onChange, onSave, busy = false, error, notice,
  groups, workshopOptions, spaceOptions, roleOptions, responsible, onResponsibleChange, searchMembers,
  members, onAddMember, onApprove, onReject, onRemoveMember, references,
  imageUrl, onUploadImage, onRemoveImage, uploading = false, onDelete, tab = 'details', onTab,
}) => {
  const shown = TABS.some(([t]) => t === tab) ? tab : 'details';
  const [confirming, setConfirming] = useState(false);
  const [removing, setRemoving] = useState(null);
  const [adding, setAdding] = useState(null);
  const text = (name) => ({ value: values[name], onChange: (e) => onChange(name, e.target.value) });
  const title = [group?.name?.sv, group?.name?.en].filter(Boolean).join(' / ');
  const completeness = group ? groupCompleteness(group) : null;
  const others = groups.filter((g) => g._id !== group?._id);
  const steering = others.filter((g) => g.type === 'steering');
  const parent = groups.find((g) => g._id === values.parentGroupId);
  const referred = references && (referenceCount(references) > 0 || references.memberships > 0);
  const blocked = group?.imageFileId || referred;
  const form = (
    <Box component="form" onSubmit={(e) => { e.preventDefault(); onSave(); }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
        <TextField label="Type" select required fullWidth slotProps={native} {...text('type')}>
          <option value="">(Select a type)</option>
          {TYPES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </TextField>
        {values.type && values.type !== 'steering' && (
          <Box sx={{ width: '100%' }}>
            <TextField label="Parent group" select fullWidth slotProps={native} {...text('parentGroupId')}
              required={values.type === 'responsibility'}
              helperText="A steering group; required for a responsibility group (ansvarsgrupp).">
              <option value="">(No parent group)</option>
              {steering.map((g) => <option key={g._id} value={g._id}>{g.name?.sv || g._id}</option>)}
            </TextField>
            {parent && <Link href={`/group/${parent._id}`} variant="body2">Open {parent.name?.sv}</Link>}
          </Box>
        )}
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
        <MemberSelect
          label="Responsible" value={responsible} onChange={onResponsibleChange} search={searchMembers}
          helperText="The group responsible (gruppansvarig); saving makes them an active member."
        />
      </Box>
      <FormControlLabel
        sx={{ mb: 1 }}
        control={<Checkbox checked={values.allowJoinRequests} onChange={(e) => onChange('allowJoinRequests', e.target.checked)} />}
        label="Members may ask to join"
      />
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
        <TextField label="Join policy" select fullWidth slotProps={native} {...text('joinPolicy')}
          helperText="Who approves requests to join.">
          {JOIN_POLICIES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </TextField>
        <TextField label="Linked role" select fullWidth slotProps={native} {...text('linkedRole')}
          helperText="Kept in step with the active members; not with an open join policy.">
          <option value="">(No linked role)</option>
          {roleOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </TextField>
      </Stack>
      {values.type === 'function' && (
        <Stack spacing={2} sx={{ mb: 2 }}>
          <TextField label="Primary space" select fullWidth slotProps={native} {...text('primarySpaceId')}
            helperText="Steering and responsibility groups get their spaces from their workshop.">
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
      )}
      <Stack spacing={2} sx={{ mb: 2 }}>
        <ChipSelect
          label="Related workshops" options={workshopOptions} value={values.relatedWorkshopIds}
          onChange={(ids) => onChange('relatedWorkshopIds', ids)}
          helperText="Workshops and areas of interest the group works with; listed on their pages in the app."
        />
        <ChipSelect
          label="Related groups" options={others.map((g) => ({ value: g._id, label: g.name?.sv || g._id }))}
          value={values.relatedGroupIds} onChange={(ids) => onChange('relatedGroupIds', ids)}
          helperText="The relation is mutual: each group is shown on the other's page."
        />
      </Stack>
      <Stack direction="row" spacing={1}>
        <Button type="submit" variant="contained" disabled={busy}>{isNew ? 'Add group' : 'Save'}</Button>
        <Button href="/groups">{isNew ? 'Cancel' : 'Back'}</Button>
      </Stack>
    </Box>
  );

  return (
    <Box sx={{ maxWidth: 900 }}>
      <Link href="/groups" underline="hover" variant="body2">← Groups</Link>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mt: 0.5, mb: 2 }}>
        <Typography variant="h4" component="h1">
          {isNew ? 'Add group' : `Group: ${title}`}
          {completeness && (
            <Chip size="small" sx={{ ml: 1, verticalAlign: 'middle' }}
              color={completeness.complete ? 'success' : 'warning'}
              label={completeness.complete ? 'Complete' : 'Incomplete'} />
          )}
        </Typography>
        {!isNew && references && !blocked && <Button color="error" variant="outlined" onClick={() => setConfirming(true)}>Delete group</Button>}
      </Stack>
      {isNew && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          The image and the members are added on the group&apos;s page once it exists.
        </Typography>
      )}
      {completeness && !completeness.complete && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Missing per the guideline: {completeness.missing.map((key) => MISSING[key] || key).join(', ')}.
        </Alert>
      )}
      {!isNew && references && blocked && (
        <Alert severity="info" sx={{ mb: 2 }}>
          This group can not be deleted while {[referred && 'something refers to it (see Members and References)', group.imageFileId && 'it has an image'].filter(Boolean).join(' and ')}.
        </Alert>
      )}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {notice && <Alert severity="success" sx={{ mb: 2 }}>{notice}</Alert>}

      {isNew ? form : (
        <>
          <PageTabs
            tabs={TABS.map(([value, label]) => ({ value, label, count: value === 'members' ? members?.active.length : value === 'references' ? referenceCount(references) : undefined }))}
            value={shown} onChange={onTab} href={(t) => groupPath(group._id, t)} />
          <TabPanel value="details" shown={shown} label="Details">{form}</TabPanel>
          <TabPanel value="image" shown={shown} label="Image">
            <Section sx={{ mt: 0 }} title="Image">
              <ImageField
                src={imageUrl} alt={group?.name?.sv} accept="image/jpeg,image/png,image/webp,image/heic"
                onUpload={onUploadImage} onRemove={onRemoveImage} uploading={uploading}
              />
            </Section>
          </TabPanel>
          <TabPanel value="members" shown={shown} label="Members">
            <Section sx={{ mt: 0 }} title="Members" note="Adding, approving and removing take effect at once. The responsible stays a member until another is chosen.">
              <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start', mb: 2 }}>
                <Box sx={{ flex: 1 }}>
                  <MemberSelect label="New member" value={adding} onChange={setAdding} search={searchMembers} />
                </Box>
                <Button variant="outlined" sx={{ mt: 1 }} disabled={!adding || busy}
                  onClick={() => { onAddMember(adding._id); setAdding(null); }}>Add member</Button>
              </Stack>
              {!members ? <Typography variant="body2">Looking…</Typography> : (
                <>
                  {members.pending.length > 0 && (
                    <>
                      <Typography variant="subtitle2">Requests to join</Typography>
                      <List dense disablePadding sx={{ mb: 2 }}>
                        {members.pending.map((m) => (
                          <MemberItem key={m.memberId} member={m}>
                            <Button size="small" variant="contained" disabled={busy} onClick={() => onApprove(m.memberId)}>Approve</Button>
                            <Button size="small" color="error" disabled={busy} onClick={() => onReject(m.memberId)}>Reject</Button>
                          </MemberItem>
                        ))}
                      </List>
                    </>
                  )}
                  {members.active.length === 0
                    ? <Typography variant="body2" color="text.secondary">No members yet.</Typography>
                    : (
                      <List dense disablePadding>
                        {members.active.map((m) => (
                          <MemberItem key={m.memberId} member={m}>
                            {!m.isResponsible && <Button size="small" color="error" disabled={busy} onClick={() => setRemoving(m)}>Remove</Button>}
                          </MemberItem>
                        ))}
                      </List>
                    )}
                </>
              )}
            </Section>
          </TabPanel>
          <TabPanel value="references" shown={shown} label="References">
            <GroupReferences references={references} />
          </TabPanel>
        </>
      )}

      <Dialog open={!!removing} onClose={() => setRemoving(null)}>
        <DialogTitle>Remove {removing?.name} from the group?</DialogTitle>
        <DialogContent><DialogContentText>They stop being a member at once{group?.linkedRole ? `, and lose the role ${group.linkedRole}` : ''}.</DialogContentText></DialogContent>
        <DialogActions>
          <Button onClick={() => setRemoving(null)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={() => { onRemoveMember(removing.memberId); setRemoving(null); }}>Remove</Button>
        </DialogActions>
      </Dialog>
      <Dialog open={confirming} onClose={() => setConfirming(false)}>
        <DialogTitle>Delete this group?</DialogTitle>
        <DialogContent><DialogContentText>“{title}” is deleted for good.</DialogContentText></DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirming(false)}>Cancel</Button>
          <Button color="error" variant="contained" disabled={busy} onClick={() => { setConfirming(false); onDelete(); }}>Delete</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
