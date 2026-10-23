import React, { useEffect, useState } from 'react';
import Typography from '@mui/material/Typography';
import { useNavigate, useQueryParam } from '../navigation';
import { useEditor } from '../components/useEditor';
import { useChoices } from '../groups/choices';
import { WorkshopForm } from './WorkshopForm';
import {
  useWorkshop, formValues, saveWorkshop, workshopDetails, removeWorkshop,
  uploadWorkshopImage, removeWorkshopImage, imageUrl,
} from './data';

/** /workshops/add without an id, /workshop/:_id with one. */
export const WorkshopEditPage = ({ _id }) => {
  const navigate = useNavigate();
  const { loading, workshop } = useWorkshop(_id);
  const choices = useChoices();
  const { values, setField, loaded, run, busy, error, setError, notice, setNotice } = useEditor({ doc: workshop, loading, toValues: formValues });
  const [details, setDetails] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [tab, setTab] = useQueryParam('tab');

  // The steering group's members and the certificates follow what is saved.
  const savedVersion = workshop?.updatedAt?.getTime();
  useEffect(() => {
    if (_id) workshopDetails(_id).then(setDetails, (e) => setError(e.reason || e.message));
  }, [_id, savedVersion]);

  if (loading || choices.loading) return <Typography color="text.secondary">Loading…</Typography>;
  if (_id && !workshop) return <Typography color="text.secondary">There is no such workshop.</Typography>;

  const groups = choices.groups.filter((g) => g.type === 'steering');

  if (!_id) {
    return (
      <WorkshopForm
        isNew values={values} onChange={setField} busy={busy} error={error}
        groups={groups} spaceOptions={choices.spaceOptions}
        onSave={() => run(() => saveWorkshop(values, null), { then: (id) => navigate(`/workshop/${id}`) })}
      />
    );
  }
  return (
    <WorkshopForm
      isNew={false}
      workshop={workshop}
      values={values}
      onChange={setField}
      onSave={() => run(() => saveWorkshop(values, loaded), { keep: 'all', then: () => setNotice('Saved.') })}
      busy={busy}
      error={error}
      notice={notice}
      groups={groups}
      spaceOptions={choices.spaceOptions}
      details={details}
      imageUrl={imageUrl(workshop)}
      uploading={uploading}
      onUploadImage={(file) => { setUploading(true); run(() => uploadWorkshopImage(_id, file)).finally(() => setUploading(false)); }}
      onRemoveImage={() => run(() => removeWorkshopImage(_id))}
      onDelete={() => run(() => removeWorkshop(_id), { then: () => navigate('/workshops') })}
      tab={tab || 'details'} onTab={(next) => setTab(next === 'details' ? '' : next)}
    />
  );
};
