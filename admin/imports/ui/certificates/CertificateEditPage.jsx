import React, { useEffect, useState } from 'react';
import Typography from '@mui/material/Typography';
import { wouldCreateCycle } from '/imports/common/lib/rules';
import { useNavigate, useQueryParam } from '../navigation';
import { useEditor } from '../components/useEditor';
import { useChoices, memberNames, searchMembers } from '../groups/choices';
import { CertificateForm } from './CertificateForm';
import {
  useCertificate, useRoleOptions, formValues, saveCertificate, removeCertificate, markMandatory,
  certificateHolders, grantAttestation, revokeAttestation, defaultCertifier, testIndex,
} from './data';

/** /certificates/add without an id, /certificate/:_id with one. */
export const CertificateEditPage = ({ _id }) => {
  const [tab, setTab] = useQueryParam('tab');
  const navigate = useNavigate();
  const { loading, certificate, certificates } = useCertificate(_id);
  const { workshops, loading: choicesLoading } = useChoices();
  const roleOptions = useRoleOptions();
  const { values, setField, loaded, run, busy, error, setError, notice, setNotice } = useEditor({ doc: certificate, loading, toValues: formValues });
  const [names, setNames] = useState({});
  const [tests, setTests] = useState([]);
  const [holders, setHolders] = useState(null);
  const [certifier, setCertifier] = useState(null);

  const refreshHolders = () => certificateHolders(_id).then(setHolders, (e) => setError(e.reason || e.message));
  useEffect(() => {
    testIndex().then(setTests);
    defaultCertifier().then(setCertifier, () => {});
  }, []);
  useEffect(() => { if (_id) refreshHolders(); }, [_id]);

  // Who the certifiers are.
  const missing = values.certifiers.filter((id) => !names[id]);
  useEffect(() => {
    if (missing.length) {
      memberNames(missing).then((found) => setNames((known) => ({
        ...known, ...Object.fromEntries(found.map((m) => [m._id, m])),
      })), (e) => setError(e.reason || e.message));
    }
  }, [missing.join(',')]);

  if (loading || choicesLoading) return <Typography color="text.secondary">Loading…</Typography>;
  if (_id && !certificate) return <Typography color="text.secondary">There is no such certificate.</Typography>;

  const byId = Object.fromEntries(certificates.map((c) => [c._id, c]));
  const certificateName = (id) => byId[id]?.name?.sv || id;
  const prerequisiteOptions = certificates
    .filter((c) => c._id !== _id && !(_id && wouldCreateCycle(_id, c._id, byId)))
    .map((c) => ({ value: c._id, label: c.name?.sv || c._id }))
    .sort((a, b) => a.label.localeCompare(b.label, 'sv'));
  const common = {
    values, onChange: setField, busy, error,
    workshops, roleOptions, prerequisiteOptions, certificateName, searchMembers, tests,
    certifiers: values.certifiers.map((id) => names[id] || { _id: id, name: id }),
    onAddCertifier: (member) => {
      setNames((known) => ({ ...known, [member._id]: member }));
      setField('certifiers', [...values.certifiers, member._id]);
    },
    onRemoveCertifier: (id) => setField('certifiers', values.certifiers.filter((c) => c !== id)),
  };

  if (!_id) {
    return (
      <CertificateForm
        isNew {...common}
        onSave={() => run(() => saveCertificate(values, null), { then: (id) => navigate(`/certificate/${id}`) })}
      />
    );
  }

  // Granting and revoking leave the certificate itself as it is.
  const asIs = { keep: null, then: refreshHolders };
  const granted = async (action) => {
    let done = false;
    await run(async () => { await action(); done = true; }, asIs);
    return done;
  };
  return (
    <CertificateForm
      isNew={false}
      {...common}
      certificate={certificate}
      notice={notice}
      onSave={() => run(() => saveCertificate(values, loaded), { keep: 'all', then: () => setNotice('Saved.') })}
      canMarkMandatory={!certificates.some((c) => c.mandatory)}
      onMarkMandatory={() => run(() => markMandatory(_id))}
      holders={holders}
      defaultCertifier={certifier}
      onGrant={(grant) => granted(() => grantAttestation({ ...grant, certificateId: _id }))}
      onRevoke={(attestationId) => run(() => revokeAttestation(attestationId), asIs)}
      onDelete={() => run(() => removeCertificate(_id), { then: () => navigate('/certificates') })}
      tab={tab || 'details'} onTab={(next) => setTab(next === 'details' ? '' : next)}
    />
  );
};
