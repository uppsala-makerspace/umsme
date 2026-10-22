import React, { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { CommentsFor } from '../comments/CommentsFor';
import { useNavigate } from '../navigation';
import { MessagesFor } from '../messages/MessagesFor';
import { MembershipForm } from './MembershipForm';
import { suggestMembership, createMembership, membershipDetail, updateMembership, removeMembership } from './data';

const dayOf = (date) => (date ? new Date(date).toLocaleDateString('sv-SE') : '');
const dateOf = (dayValue) => (dayValue ? new Date(`${dayValue}T00:00:00`) : null);

const useAction = () => {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const run = async (action) => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try { await action(); } catch (e) { setError(e.reason || e.message); } finally { setBusy(false); }
  };
  return { busy, error, notice, setNotice, run };
};

/** /memberships/add?member=…&payment=… */
export const MembershipAddPage = () => {
  const navigate = useNavigate();
  const params = new URLSearchParams(window.location.search);
  const memberId = params.get('member');
  const paymentId = params.get('payment');
  const [suggestion, setSuggestion] = useState(null);
  const [values, setValues] = useState(null);
  const { busy, error, run } = useAction();
  useEffect(() => {
    suggestMembership(memberId, paymentId).then((s) => { setSuggestion(s); setValues({ amount: s.amount ?? '', start: dayOf(s.start) }); });
  }, [memberId, paymentId]);
  if (!values) return <Typography color="text.secondary">Loading…</Typography>;
  return (
    <MembershipForm
      isNew member={{ _id: memberId, name: suggestion.memberName }} values={values} busy={busy} error={error}
      onChange={(field, value) => setValues((v) => ({ ...v, [field]: value }))}
      onSave={() => run(async () => {
        await createMembership({ memberId, paymentId, startDay: values.start, amount: values.amount });
        navigate(paymentId ? `/payment/${paymentId}` : `/member/${memberId}`);
      })}
    />
  );
};

const valuesOf = (ms) => ({
  amount: ms.amount ?? '', start: dayOf(ms.start), type: ms.type || 'member', discount: !!ms.discount, family: !!ms.family,
  memberend: dayOf(ms.memberend), labend: dayOf(ms.labend),
});

/** /membership/:_id */
export const MembershipViewPage = ({ _id }) => {
  const navigate = useNavigate();
  const [detail, setDetail] = useState(null);
  const [values, setValues] = useState(null);
  const { busy, error, notice, setNotice, run } = useAction();
  useEffect(() => { membershipDetail(_id).then((d) => { setDetail(d); setValues(valuesOf(d.membership)); }); }, [_id]);
  if (!detail || !values) return <Typography color="text.secondary">Loading…</Typography>;
  const { membership, member, payment, dependents } = detail;
  return (
    <MembershipForm
      isNew={false} member={member} membership={membership} values={values} busy={busy} error={error} notice={notice} dependents={dependents} payment={payment}
      onChange={(field, value) => setValues((v) => ({ ...v, [field]: value }))}
      onSave={() => run(async () => {
        await updateMembership(_id, {
          amount: Number(values.amount), start: dateOf(values.start), type: values.type, discount: values.discount, family: values.family,
          memberend: dateOf(values.memberend), labend: dateOf(values.labend),
        }, membership.updatedAt);
        // The saved version, so that the next save is checked against it.
        setDetail(await membershipDetail(_id));
        setNotice('Saved.');
      })}
      onDelete={() => run(async () => { await removeMembership(_id); navigate(`/member/${member._id}`); })}
      after={(
        <Box sx={{ mt: 4 }}>
          <MessagesFor memberId={member._id} membershipId={_id} />
          <CommentsFor about={_id} />
        </Box>
      )}
    />
  );
};
