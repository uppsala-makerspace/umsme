import React, { useEffect, useState } from 'react';
import { Meteor } from 'meteor/meteor';
import { PendingMembers } from './PendingMembers';

export const PendingMembersPage = () => {
  const [members, setMembers] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const load = () => Meteor.callAsync('members.pending').then(setMembers, (e) => setError(e.reason || e.message));
  useEffect(() => { load(); }, []);
  const onAccept = async (memberId) => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const name = members.find((m) => m._id === memberId)?.name;
      const welcomed = await Meteor.callAsync('members.acceptPending', memberId);
      setNotice(`${name} is accepted${welcomed ? ' and welcomed' : ''}.`);
      await load();
    } catch (e) {
      setError(e.reason || e.message);
    } finally {
      setBusy(false);
    }
  };
  return <PendingMembers members={members} onAccept={onAccept} busy={busy} error={error} notice={notice} />;
};
