import React, { useEffect, useRef, useState } from 'react';
import { useServerList } from '../components/useServerList';
import { useQueryParams } from '../components/useQueryParams';
import { Payments } from './Payments';
import { PaymentList } from './PaymentList';
import { BankSync } from './BankSync';
import {
  paymentPage, useStoreItemOptions, usePnr, setPnr, checkBank, initiateBank, signOutBank, synchronizeBank,
} from './data';

/** The bank synchronization: the sign-in state, polled while a sign-in waits. */
const useBank = (onSynchronized) => {
  const pnr = usePnr();
  const [status, setStatus] = useState('unknown');
  const [qr, setQr] = useState(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const poll = useRef(null);
  const check = () => checkBank().then((res) => setStatus(res?.status || 'unknown'), (e) => setStatus(`error: ${e.error || e.message}`));
  useEffect(() => { if (pnr) check(); return () => clearInterval(poll.current); }, [pnr]);
  const act = async (action) => {
    setBusy(true);
    setError(null);
    try { await action(); } catch (e) { setError(e.reason || e.message); } finally { setBusy(false); }
  };
  return {
    pnr, status, qr, busy, result, error,
    onSavePnr: (value) => act(() => setPnr(value)),
    onSignIn: () => act(async () => {
      setQr(await initiateBank());
      setStatus('waiting');
      let tries = 20;
      clearInterval(poll.current);
      poll.current = setInterval(async () => {
        const res = await checkBank().catch(() => null);
        tries -= 1;
        if (res?.status) setStatus(res.status);
        if (tries < 0 || (res && res.status !== 'waiting')) clearInterval(poll.current);
      }, 2000);
    }),
    onSignOut: () => act(async () => { await signOutBank(); setStatus('uninitiated'); }),
    onSynchronize: () => act(async () => { setResult((await synchronizeBank()) || null); onSynchronized(); }),
  };
};

/** /payments, the tab in the URL. */
export const PaymentsPage = () => {
  const [query, setQuery] = useQueryParams(['tab', 'item']);
  const tab = query.tab || 'manual';
  const list = useServerList(paymentPage(tab, query.item), { sort: { field: 'date', direction: 'desc' }, deps: [tab, query.item] });
  const bank = useBank(list.refresh);
  const storeItems = useStoreItemOptions();
  return (
    <Payments
      tab={tab} onTab={(next) => setQuery({ tab: next === 'manual' ? '' : next, item: '' })}
      bank={<BankSync {...bank} />} list={<PaymentList tab={tab} list={list} />}
      storeItems={storeItems} storeItem={query.item} onStoreItem={(item) => setQuery({ item })}
    />
  );
};
