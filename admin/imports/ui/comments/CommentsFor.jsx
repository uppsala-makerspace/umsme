import React, { useEffect, useState } from 'react';
import { CommentsSection } from './Comments';
import { useComments, addComment, updateComment, removeComment } from './data';

/** The comments about one thing, by its id, for any page; `onCount` hears how many there are, `inTab` as CommentsSection's. */
export const CommentsFor = ({ about, onCount, inTab = false }) => {
  const { comments, loading } = useComments(about);
  useEffect(() => { if (onCount && !loading) onCount(comments.length); }, [loading, comments.length]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const act = async (action) => {
    setBusy(true);
    setError(null);
    try {
      await action();
      return true;
    } catch (e) {
      setError(e.reason || e.message);
      return false;
    } finally {
      setBusy(false);
    }
  };
  return (
    <CommentsSection
      comments={comments} busy={busy} error={error} inTab={inTab}
      onAdd={(text) => act(() => addComment(about, text))}
      onUpdate={(id, text) => act(() => updateComment(id, text))}
      onRemove={(id) => act(() => removeComment(id))}
    />
  );
};
