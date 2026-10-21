import React, { useState } from 'react';
import { LockSync } from './LockSync';
import { lockOverview, fixLockEndDate } from './data';

export const LockSyncPage = () => {
  const [rows, setRows] = useState(null);
  const [shown, setShown] = useState(['wrong', 'stale']);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const act = async (action) => {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (e) {
      setError(e.reason || e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <LockSync
      rows={rows} shown={shown} onShownChange={setShown} busy={busy} error={error}
      onSynchronize={() => act(async () => setRows(await lockOverview()))}
      onFix={(memberId) => act(async () => {
        await fixLockEndDate(memberId);
        // The lock has it now; what it says shows at the next synchronization.
        setRows((current) => current.map((r) => (r._id === memberId ? { ...r, status: 'stale', fix: false } : r)));
      })}
    />
  );
};
