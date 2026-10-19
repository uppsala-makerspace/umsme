import { useState } from 'react';

const read = (keys) => {
  const params = new URLSearchParams(window.location.search);
  return Object.fromEntries(keys.map((key) => [key, params.get(key) ?? '']));
};

/**
 * State kept in the URL's query, so that a reload or a shared link keeps a
 * page's filters. Empty values leave the query; the history is replaced, not
 * added to.
 *
 * @param {string[]} keys
 * @returns {[object, (changes: object) => void]}
 */
export const useQueryParams = (keys) => {
  const [values, setValues] = useState(() => read(keys));
  const update = (changes) => {
    const next = { ...values, ...changes };
    const params = new URLSearchParams(window.location.search);
    for (const key of keys) {
      if (next[key]) params.set(key, next[key]); else params.delete(key);
    }
    const query = params.toString();
    window.history.replaceState(window.history.state, '', `${window.location.pathname}${query ? `?${query}` : ''}`);
    setValues(next);
  };
  return [values, update];
};
