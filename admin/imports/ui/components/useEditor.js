import { useEffect, useRef, useState } from 'react';

/**
 * The state of an edit page: the form's values, the version saves are
 * checked against, and running an action with busy, error and notice.
 *
 * `loaded` is the document as the form last took it over; save with it, so
 * that a change someone else makes meanwhile is refused (the methods compare
 * its updatedAt or modified). Our own writes move the version on: run() with
 * keep 'all' (a save) takes over the next version the publication delivers,
 * values and all; keep 'version' (an icon, a tick) takes only the version, so
 * unsaved edits stay.
 *
 * @param {{ doc: object|null, loading: boolean, toValues: (doc|null) => object, version?: (doc) => any }} options
 */
export const useEditor = ({ doc, loading, toValues, version = (d) => d?.updatedAt?.getTime() }) => {
  const [values, setValues] = useState(() => toValues(null));
  const [loaded, setLoaded] = useState(null);
  const refresh = useRef('all');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    if (loading || !doc || !refresh.current) return;
    if (refresh.current === 'all') setValues(toValues(doc));
    setLoaded(doc);
    refresh.current = null;
  }, [doc?._id, version(doc), loading]);

  /** Run an action; `then` gets its result. Errors show; they are not thrown. */
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

  const setField = (field, value) => setValues((current) => ({ ...current, [field]: value }));

  return { values, setField, loaded, run, busy, error, setError, notice, setNotice };
};
