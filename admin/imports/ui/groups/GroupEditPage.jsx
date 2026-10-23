import React, { useEffect, useState } from 'react';
import Typography from '@mui/material/Typography';
import { useNavigate, useQueryParam } from '../navigation';
import { useEditor } from '../components/useEditor';
import { useChoices, memberNames, searchMembers } from './choices';
import { GroupForm } from './GroupForm';
import {
  useGroup, useRoleOptions, formValues, saveGroup, groupReferences, removeGroup,
  addGroupMember, rejectGroupRequest, removeGroupMember, uploadGroupImage, removeGroupImage, imageUrl,
} from './data';

const byName = (a, b) => a.name.localeCompare(b.name, 'sv');

/** /groups/add without an id, /group/:_id with one. */
export const GroupEditPage = ({ _id }) => {
  const navigate = useNavigate();
  const { loading, group, memberships } = useGroup(_id);
  const choices = useChoices();
  const roleOptions = useRoleOptions();
  const { values, setField, loaded, run, busy, error, setError, notice, setNotice } = useEditor({ doc: group, loading, toValues: formValues });
  const [names, setNames] = useState({});
  const [references, setReferences] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [tab, setTab] = useQueryParam('tab');

  // Who the stored ids are: the members and the responsible.
  const ids = [...new Set([...memberships.map((m) => m.memberId), values.responsibleMemberId].filter(Boolean))].sort();
  const missing = ids.filter((id) => !names[id]);
  useEffect(() => {
    if (missing.length) {
      memberNames(missing).then((found) => setNames((known) => ({
        ...known, ...Object.fromEntries(found.map((m) => [m._id, m])),
      })), (e) => setError(e.reason || e.message));
    }
  }, [missing.join(',')]);

  const savedVersion = group?.updatedAt?.getTime();
  useEffect(() => {
    if (_id) groupReferences(_id).then(setReferences, (e) => setError(e.reason || e.message));
  }, [_id, savedVersion, memberships.length]);

  if (loading || choices.loading) return <Typography color="text.secondary">Loading…</Typography>;
  if (_id && !group) return <Typography color="text.secondary">There is no such group.</Typography>;

  const person = (id) => names[id] || { _id: id, name: id };
  const responsible = values.responsibleMemberId ? person(values.responsibleMemberId) : null;
  const onResponsibleChange = (member) => {
    if (member) setNames((known) => ({ ...known, [member._id]: member }));
    setField('responsibleMemberId', member?._id || '');
  };
  const common = {
    values, onChange: setField, busy, error,
    groups: choices.groups, workshopOptions: choices.workshopOptions, spaceOptions: choices.spaceOptions,
    roleOptions, responsible, onResponsibleChange, searchMembers,
  };

  if (!_id) {
    return (
      <GroupForm
        isNew {...common}
        onSave={() => run(() => saveGroup(values, null), { then: (id) => navigate(`/group/${id}`) })}
      />
    );
  }

  // Membership actions leave the group itself as it is: no new version to take over.
  const asIs = { keep: null };
  const listed = (state) => memberships.filter((m) => m.state === state)
    .map((m) => ({ memberId: m.memberId, name: person(m.memberId).name, mid: person(m.memberId).mid, isResponsible: m.memberId === group.responsibleMemberId }))
    .sort(byName);

  return (
    <GroupForm
      isNew={false}
      {...common}
      group={group}
      notice={notice}
      onSave={() => run(() => saveGroup(values, loaded), { keep: 'all', then: () => setNotice('Saved.') })}
      members={{ active: listed('active'), pending: listed('pending') }}
      onAddMember={(memberId) => run(() => addGroupMember(_id, memberId), asIs)}
      onApprove={(memberId) => run(() => addGroupMember(_id, memberId), asIs)}
      onReject={(memberId) => run(() => rejectGroupRequest(_id, memberId), asIs)}
      onRemoveMember={(memberId) => run(() => removeGroupMember(_id, memberId), asIs)}
      references={references}
      imageUrl={imageUrl(group)}
      uploading={uploading}
      onUploadImage={(file) => { setUploading(true); run(() => uploadGroupImage(_id, file)).finally(() => setUploading(false)); }}
      onRemoveImage={() => run(() => removeGroupImage(_id))}
      onDelete={() => run(() => removeGroup(_id), { then: () => navigate('/groups') })}
      tab={tab || 'details'} onTab={(next) => setTab(next === 'details' ? '' : next)}
    />
  );
};
