import React, { useState } from 'react';
import { DoorStats } from './DoorStats';
import { doorVisits } from './data';

export const DoorStatsPage = () => {
  const [visits, setVisits] = useState(null);
  const [source, setSource] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const onCheck = async (from) => {
    setBusy(true);
    setError(null);
    try {
      setVisits(await doorVisits(from));
      setSource(from);
    } catch (e) {
      setError(e.reason || e.message);
    } finally {
      setBusy(false);
    }
  };
  return <DoorStats visits={visits} source={source} onCheck={onCheck} busy={busy} error={error} />;
};
