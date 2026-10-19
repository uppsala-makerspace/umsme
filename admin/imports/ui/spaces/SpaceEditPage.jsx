import React, { useEffect, useState } from 'react';
import Typography from '@mui/material/Typography';
import { useNavigate } from '../navigation';
import { useEditor } from '../components/useEditor';
import { SpaceForm } from './SpaceForm';
import { useSpace, formValues, saveSpace, spaceLinks, removeSpace, uploadSpaceIcon, removeSpaceIcon, iconUrl } from './data';

/** /spaces/add without an id, /space/:_id with one. */
export const SpaceEditPage = ({ _id }) => {
  const navigate = useNavigate();
  const { loading, space } = useSpace(_id);
  const { values, setField, loaded, run, busy, error, setError, notice, setNotice } = useEditor({ doc: space, loading, toValues: formValues });
  const [links, setLinks] = useState(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (_id) spaceLinks(_id).then(setLinks, (e) => setError(e.reason || e.message));
  }, [_id]);

  if (loading) return <Typography color="text.secondary">Loading…</Typography>;
  if (_id && !space) return <Typography color="text.secondary">There is no such space.</Typography>;

  if (!_id) {
    return (
      <SpaceForm
        isNew values={values} onChange={setField} busy={busy} error={error}
        onSave={() => run(() => saveSpace(values, null), { then: (id) => navigate(`/space/${id}`) })}
      />
    );
  }
  return (
    <SpaceForm
      isNew={false}
      space={space}
      values={values}
      onChange={setField}
      onSave={() => run(() => saveSpace(values, loaded), { keep: 'all', then: () => setNotice('Saved.') })}
      busy={busy}
      error={error}
      notice={notice}
      iconUrl={iconUrl(space)}
      uploading={uploading}
      onUploadIcon={(file) => { setUploading(true); run(() => uploadSpaceIcon(_id, file)).finally(() => setUploading(false)); }}
      onRemoveIcon={() => run(() => removeSpaceIcon(_id))}
      links={links}
      onDelete={() => run(() => removeSpace(_id), { then: () => navigate('/spaces') })}
    />
  );
};
