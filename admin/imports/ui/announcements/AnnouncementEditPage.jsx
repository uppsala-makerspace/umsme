import React from 'react';
import Typography from '@mui/material/Typography';
import { useNavigate } from '../navigation';
import { useEditor } from '../components/useEditor';
import { AnnouncementForm } from './AnnouncementForm';
import { useAnnouncement, formValues, saveAnnouncement, removeAnnouncement } from './data';

/** /announcements/new without an id; /announcement/:_id (and its old /edit) with one. */
export const AnnouncementEditPage = ({ _id }) => {
  const navigate = useNavigate();
  const { loading, announcement } = useAnnouncement(_id);
  const { values, setField, loaded, run, busy, error, notice, setNotice } = useEditor({ doc: announcement, loading, toValues: formValues });

  if (loading) return <Typography color="text.secondary">Loading…</Typography>;
  if (_id && !announcement) return <Typography color="text.secondary">There is no such announcement.</Typography>;

  if (!_id) {
    return (
      <AnnouncementForm
        isNew values={values} onChange={setField} busy={busy} error={error}
        onSave={() => run(() => saveAnnouncement(values, null), { then: (id) => navigate(`/announcement/${id}`) })}
      />
    );
  }
  const dirty = !!loaded && JSON.stringify(values) !== JSON.stringify(formValues(loaded));
  return (
    <AnnouncementForm
      isNew={false}
      announcement={announcement}
      values={values}
      onChange={setField}
      dirty={dirty}
      onSave={() => run(() => saveAnnouncement(values, loaded), { keep: 'all', then: () => setNotice('Saved.') })}
      busy={busy}
      error={error}
      notice={notice}
      onDelete={() => run(() => removeAnnouncement(_id), { then: () => navigate('/announcements') })}
    />
  );
};
