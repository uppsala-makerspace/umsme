import React, { useEffect, useState } from 'react';
import Typography from '@mui/material/Typography';
import { useNavigate } from '../navigation';
import { BlazeTemplate } from '../components/BlazeTemplate';
import { searchMembers } from '../groups/choices';
import { PaymentView } from './PaymentView';
import {
  paymentDetail, assignMember, unassignMember, setOther, linkMembership, unlinkMembership, removePayment,
} from './data';

/** /payment/:_id */
export const PaymentViewPage = ({ _id }) => {
  const navigate = useNavigate();
  const [detail, setDetail] = useState(null);
  const [missing, setMissing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const load = () => paymentDetail(_id).then(setDetail, (e) => (e.error === 'not-found' ? setMissing(true) : setError(e.reason || e.message)));
  useEffect(() => { load(); }, [_id]);
  if (missing) return <Typography>There is no such payment.</Typography>;
  if (!detail) return <Typography color="text.secondary">Loading…</Typography>;
  const act = (action, then = load) => async (...args) => {
    setBusy(true);
    setError(null);
    try {
      await action(...args);
      await then();
    } catch (e) {
      setError(e.reason || e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <PaymentView
      detail={detail} busy={busy} error={error} search={searchMembers}
      comments={<BlazeTemplate name="CommentList" data={{ about: _id }} />}
      on={{
        assign: act((memberId) => assignMember(_id, memberId)),
        unassign: act(() => unassignMember(_id)),
        setOther: act((other) => setOther(_id, other)),
        link: act((membershipId) => linkMembership(_id, membershipId)),
        unlink: act(() => unlinkMembership(_id)),
        remove: act(() => removePayment(_id), () => navigate('/payments')),
        newMembership: () => navigate(`/memberships/add?payment=${_id}&member=${detail.member._id}`),
      }}
    />
  );
};
