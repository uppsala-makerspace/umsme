import React, { useEffect, useState } from 'react';
import { BlazeTemplate } from '../components/BlazeTemplate';
import { AdminConsole } from './AdminConsole';
import { MemberMerge } from './MemberMerge';
import { syncLock, mergePreview, mergeMembers, mandatoryGrantCount, grantMandatoryToAll } from './data';

const reason = (e) => e.reason || e.message;

/** /admin */
export const AdminConsolePage = () => {
  const [busy, setBusy] = useState(null);
  const [results, setResults] = useState({});
  const [mandatory, setMandatory] = useState(undefined);
  const [merge, setMerge] = useState({ plan: null, done: null, error: null });
  const loadMandatory = () => mandatoryGrantCount().then(setMandatory, (e) => setResults((r) => ({ ...r, grantMandatory: { severity: 'error', text: reason(e) } })));
  useEffect(() => { loadMandatory(); }, []);

  /** Run a console action, its outcome kept under its name. */
  const run = async (name, action, report) => {
    setBusy(name);
    setResults((r) => ({ ...r, [name]: null }));
    try {
      const result = await action();
      setResults((r) => ({ ...r, [name]: { severity: 'success', text: report(result) } }));
    } catch (e) {
      setResults((r) => ({ ...r, [name]: { severity: 'error', text: reason(e) } }));
    }
    setBusy(null);
  };
  const runMerge = async (action, next) => {
    setBusy('merge');
    try {
      setMerge(next(await action()));
    } catch (e) {
      setMerge({ plan: null, done: null, error: reason(e) });
    }
    setBusy(null);
  };

  return (
    <AdminConsole
      busy={busy} results={results} mandatory={mandatory}
      on={{
        syncLock: () => run('syncLock', syncLock, (message) => message || 'Sync done.'),
        grantMandatory: () => run('grantMandatory', async () => { const n = await grantMandatoryToAll(); await loadMandatory(); return n; }, (n) => `Created ${n} attestations.`),
      }}
      merge={(
        <MemberMerge
          {...merge} busy={busy === 'merge'}
          onEdit={() => setMerge((m) => (m.plan || m.error ? { ...m, plan: null, error: null } : m))}
          onPreview={(s, d) => runMerge(() => mergePreview(s, d), (plan) => ({ plan, done: null, error: null }))}
          onMerge={(s, d) => runMerge(() => mergeMembers(s, d), (done) => ({ plan: null, done, error: null }))}
        />
      )}
      after={<BlazeTemplate name="AdminOneOffTools" />}
    />
  );
};
