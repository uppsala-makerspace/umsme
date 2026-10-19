import React, { useEffect, useState } from 'react';
import Typography from '@mui/material/Typography';
import { LiabilityForm } from './LiabilityForm';
import { useLiabilityDocument, formValues, saveLiabilityDocument, removeLiabilityDocument } from './data';
import { useNavigate } from '../navigation';

/** /liability/add without an id, /liability/:_id with one. */
export const LiabilityEditPage = ({ _id }) => {
  const navigate = useNavigate();
  const { loading, document } = useLiabilityDocument(_id);
  const [values, setValues] = useState(formValues(null));
  // The version as it was when the form opened. Saving sends its updatedAt,
  // so a change someone else made meanwhile is refused instead of overwritten;
  // `document` itself follows the database and would always look current.
  const [loaded, setLoaded] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  // Only once the whole document is here: the list's publication leaves a
  // partial copy (title and date) in the client, which would otherwise fill
  // the form with empty texts and stay there.
  useEffect(() => {
    if (loading || !document) return;
    setLoaded(document);
    setValues(formValues(document));
  }, [document?._id, loading]);

  const run = async (action) => {
    setBusy(true);
    setError(null);
    try {
      await action();
      navigate('/liability');
    } catch (e) {
      setError(e.reason || e.message);
      setBusy(false);
    }
  };

  if (_id && loading) return <Typography color="text.secondary">Loading…</Typography>;
  if (_id && !document) return <Typography color="text.secondary">There is no such liability document.</Typography>;
  return (
    <LiabilityForm
      isNew={!_id}
      values={values}
      onChange={(field, value) => setValues((current) => ({ ...current, [field]: value }))}
      onSave={() => run(() => saveLiabilityDocument(values, loaded))}
      onDelete={() => run(() => removeLiabilityDocument(_id))}
      busy={busy}
      error={error}
    />
  );
};
