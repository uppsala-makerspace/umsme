import React, { useEffect, useRef, useState } from 'react';
import Typography from '@mui/material/Typography';
import { useNavigate } from '../navigation';
import { StoreItemForm } from './StoreItemForm';
import {
  useStoreItem, formValues, saveStoreItem, setStoreItemWorkshops, storeItemSales, removeStoreItem,
  uploadStoreItemImage, removeStoreItemImage, imageUrl,
} from './data';

/** /storeitems/add without an id, /storeitem/:_id with one. */
export const StoreItemEditPage = ({ _id }) => {
  const navigate = useNavigate();
  const { loading, item, workshops } = useStoreItem(_id);
  const [values, setValues] = useState(formValues(null));
  // The version saves are checked against: updatedAt as the form saw it. A
  // change someone else makes meanwhile is refused at save. Our own writes
  // (save, image, workshops) move it on; `refresh` says how much to take over
  // from the next version the publication delivers: everything after a save,
  // only the version after an image or workshop change, so unsaved edits stay.
  const [loaded, setLoaded] = useState(null);
  const refresh = useRef('all');
  const [sales, setSales] = useState(null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  // The ticked workshops, changed at once on a click and brought in line with
  // the item whenever the publication delivers it.
  const [linked, setLinked] = useState([]);
  useEffect(() => setLinked(item?.workshopIds || []), [JSON.stringify(item?.workshopIds || [])]);

  useEffect(() => {
    if (loading || !item || !refresh.current) return;
    if (refresh.current === 'all') setValues(formValues(item));
    setLoaded(item);
    refresh.current = null;
  }, [item?._id, item?.updatedAt?.getTime(), loading]);

  useEffect(() => {
    if (_id) storeItemSales(_id).then(setSales, (e) => setError(e.reason || e.message));
  }, [_id]);

  const run = async (action, { then, keep = 'version' } = {}) => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      refresh.current = keep;
      const result = await action();
      if (then) then(result);
    } catch (e) {
      refresh.current = null;
      setError(e.reason || e.message);
    }
    setBusy(false);
  };

  if (loading) return <Typography color="text.secondary">Loading…</Typography>;
  if (_id && !item) return <Typography color="text.secondary">There is no such store item.</Typography>;

  if (!_id) {
    return (
      <StoreItemForm
        isNew values={values} busy={busy} error={error}
        onChange={(field, value) => setValues((current) => ({ ...current, [field]: value }))}
        onSave={() => run(() => saveStoreItem(values, null), { then: (id) => navigate(`/storeitem/${id}`) })}
      />
    );
  }

  return (
    <StoreItemForm
      isNew={false}
      item={item}
      values={values}
      onChange={(field, value) => setValues((current) => ({ ...current, [field]: value }))}
      onSave={() => run(() => saveStoreItem(values, loaded), { keep: 'all', then: () => setNotice('Saved.') })}
      busy={busy}
      error={error}
      notice={notice}
      workshops={workshops.map((w) => ({
        _id: w._id, name: w.name?.sv || w._id, isArea: w.kind === 'areaOfInterest', checked: linked.includes(w._id),
      }))}
      onToggleWorkshop={(workshopId, checked) => {
        const previous = linked;
        const next = checked ? [...linked, workshopId] : linked.filter((id) => id !== workshopId);
        setLinked(next);
        // Back to what it was if the server says no; on success the
        // publication brings the item, and the effect above, in line.
        run(() => setStoreItemWorkshops(_id, next).catch((e) => { setLinked(previous); throw e; }));
      }}
      imageUrl={imageUrl(item)}
      uploading={uploading}
      onUploadImage={(file) => { setUploading(true); run(() => uploadStoreItemImage(_id, file)).finally(() => setUploading(false)); }}
      onRemoveImage={() => run(() => removeStoreItemImage(_id))}
      sales={sales}
      onDelete={() => run(() => removeStoreItem(_id), { then: () => navigate('/storeitems') })}
    />
  );
};
