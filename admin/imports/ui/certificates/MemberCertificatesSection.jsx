import React, { useEffect, useState } from 'react';
import { searchMembers } from '../groups/choices';
import { MemberCertificates } from './MemberCertificates';
import {
  useCertificateList, memberCertificates, grantAttestation, revokeAttestation, defaultCertifier,
  testAttempts, resetTestAttempts,
} from './data';

/** Attempts grouped per certificate, latest state first. */
const attemptGroups = (attempts, name) => {
  const byCertificate = new Map();
  for (const a of attempts) {
    const group = byCertificate.get(a.certificateId) || { certificateId: a.certificateId, testId: a.testId, attempts: [] };
    group.attempts.push(a);
    byCertificate.set(a.certificateId, group);
  }
  return [...byCertificate.values()].map((g) => {
    const [last] = g.attempts.slice().sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt));
    return { certificateId: g.certificateId, certificateName: name(g.certificateId), testId: g.testId, count: g.attempts.length, lastState: last?.state || '' };
  });
};

/** The member page's certificates. */
export const MemberCertificatesSection = ({ memberId }) => {
  const { certificates } = useCertificateList();
  const [attestations, setAttestations] = useState(null);
  const [attempts, setAttempts] = useState([]);
  const [certifier, setCertifier] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const refresh = () => Promise.all([
    memberCertificates(memberId).then(setAttestations),
    testAttempts(memberId).then(setAttempts),
  ]).catch((e) => setError(e.reason || e.message));
  useEffect(() => { refresh(); }, [memberId]);
  useEffect(() => { defaultCertifier().then(setCertifier, () => {}); }, []);

  const act = async (action) => {
    setBusy(true);
    setError(null);
    try {
      await action();
      await refresh();
      return true;
    } catch (e) {
      setError(e.reason || e.message);
      return false;
    } finally {
      setBusy(false);
    }
  };

  const name = (id) => certificates.find((c) => c._id === id)?.name?.sv || id;
  const options = certificates
    .map((c) => ({ value: c._id, label: c.name?.sv || c._id, validityDays: c.defaultValidityDays }))
    .sort((a, b) => a.label.localeCompare(b.label, 'sv'));
  return (
    <MemberCertificates
      attestations={attestations} certificates={options} search={searchMembers} defaultCertifier={certifier}
      onGrant={(grant) => act(() => grantAttestation({ ...grant, memberId }))}
      onRevoke={(attestationId) => act(() => revokeAttestation(attestationId))}
      attempts={attempts && attemptGroups(attempts, name)}
      onResetAttempts={(certificateId) => act(() => resetTestAttempts(memberId, certificateId))}
      busy={busy} error={error}
    />
  );
};
