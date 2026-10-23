import React, { useEffect, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useNavigate, useQueryParam } from '../navigation';
import { useEditor } from '../components/useEditor';
import { useServerList } from '../components/useServerList';
import { CommentsFor } from '../comments/CommentsFor';
import { MessagesFor } from '../messages/MessagesFor';
import { MemberCertificatesSection } from '../certificates/MemberCertificatesSection';
import { MemberList } from './MemberList';
import { MemberView } from './MemberView';
import { MemberForm, memberValues, memberFields } from './MemberForm';
import { memberPath } from './paths';
import {
  memberPage, familyCandidatePage, getMember, memberDetail, createMember, updateMember, setRegistered, setExcluded,
  refreshDates, removeMember, addToFamily, removeFromFamily, cancelInvite, memberDraftFromPayment, downloadMembers,
} from './data';

/** /members */
export const MembersPage = () => (
  <MemberList
    title="Members" empty="No members."
    actions={(
      <Stack direction="row" spacing={1}>
        <Button onClick={() => downloadMembers('current')}>Download current members</Button>
        <Button onClick={() => downloadMembers('all')}>Download all members</Button>
        <Button variant="contained" href="/members/add">Add member</Button>
      </Stack>
    )}
    {...useServerList(memberPage('all'), { sort: { field: 'name', direction: 'asc' } })}
  />
);

/** /members/add?payment=…&infamily=… */
export const MemberAddPage = () => {
  const navigate = useNavigate();
  const params = new URLSearchParams(window.location.search);
  const paymentId = params.get('payment');
  const infamily = params.get('infamily');
  const [values, setValues] = useState(() => memberValues(null));
  const [payment, setPayment] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  useEffect(() => {
    if (paymentId) memberDraftFromPayment(paymentId).then(({ payment: p, draft }) => { setPayment(p); setValues((v) => ({ ...v, ...draft })); });
  }, [paymentId]);
  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const id = await createMember(memberFields(values), { infamily, paymentId });
      navigate(infamily ? memberPath(infamily, 'family') : paymentId ? `/payment/${paymentId}` : `/member/${id}`);
    } catch (e) {
      setError(e.reason || e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Box sx={{ maxWidth: 900 }}>
      <Typography variant="h4" component="h1" sx={{ mb: 2 }}>Add new member</Typography>
      {infamily && <Alert severity="info" sx={{ mb: 2 }}>The new member joins the family of the member you came from.</Alert>}
      {payment && (
        <Alert severity="info" sx={{ mb: 2 }}>
          For the payment of {payment.amount} kr on {new Date(payment.date).toLocaleDateString('sv-SE')}{payment.message ? `: ${payment.message}` : ''}; the new member becomes its owner.
        </Alert>
      )}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <MemberForm values={values} onChange={(f, v) => setValues((c) => ({ ...c, [f]: v }))} onSave={save} busy={busy} submitLabel="Add member" />
    </Box>
  );
};

/** /member/:_id/add: an existing member to join this payer's family. */
export const FamilyAddPage = ({ _id }) => {
  const navigate = useNavigate();
  const [error, setError] = useState(null);
  const list = useServerList(familyCandidatePage(_id), { sort: { field: 'name', direction: 'asc' } });
  return (
    <MemberList
      title="Members not connected to a family" note="Choose the member to add to the family."
      actions={<Button href={`/members/add?infamily=${_id}`}>Add new</Button>}
      {...list} error={error || list.error}
      onRowClick={async ({ row }) => {
        try {
          await addToFamily(_id, row._id);
          navigate(memberPath(_id, 'family'));
        } catch (e) {
          setError(e.reason || e.message);
        }
      }}
    />
  );
};

/** /member/:_id */
export const MemberViewPage = ({ _id }) => {
  const navigate = useNavigate();
  const [member, setMember] = useState(null);
  const [detail, setDetail] = useState(null);
  const [missing, setMissing] = useState(false);
  const [tab, setTab] = useQueryParam('tab');
  const [counts, setCounts] = useState({});
  const counted = (name) => (n) => setCounts((c) => (c[name] === n ? c : { ...c, [name]: n }));
  const { values, setField, loaded, run, busy, error, setError, notice, setNotice } = useEditor({ doc: member, loading: !member, toValues: memberValues });
  const load = async () => {
    const [m, d] = await Promise.all([getMember(_id), memberDetail(_id).catch(() => null)]);
    if (!m) setMissing(true);
    setMember(m);
    setDetail(d);
  };
  useEffect(() => { load().catch((e) => setError(e.reason || e.message)); }, [_id]);
  if (missing) return <Typography>There is no such member.</Typography>;
  if (!member || !detail) return <Typography color="text.secondary">Loading…</Typography>;
  const act = (action, options = { keep: 'version' }) => run(async () => { await action(); await load(); }, options);
  return (
    <MemberView
      member={member} detail={detail} values={values} onChange={setField} busy={busy} error={error} notice={notice}
      tab={tab || 'details'} onTab={(next) => setTab(next === 'details' ? '' : next)} counts={counts}
      onSave={() => run(async () => { await updateMember(_id, memberFields(values), loaded?.updatedAt); await load(); }, { keep: 'all', then: () => setNotice('Saved.') })}
      on={{
        refresh: () => act(() => refreshDates(_id)),
        register: (on) => act(() => setRegistered(_id, on)),
        exclude: (on) => act(() => setExcluded(_id, on)),
        remove: () => run(() => removeMember(_id), { then: () => navigate('/members') }),
        removeFromFamily: () => act(() => removeFromFamily(_id)),
        cancelInvite: (inviteId) => act(() => cancelInvite(inviteId)),
        declineInvite: (inviteId) => act(() => cancelInvite(inviteId)),
      }}
      messages={!member.infamily && <MessagesFor memberId={_id} onCount={counted('messages')} />}
      comments={<CommentsFor about={_id} onCount={counted('comments')} inTab />}
      certificates={<MemberCertificatesSection memberId={_id} onCount={counted('certificates')} />}
    />
  );
};
