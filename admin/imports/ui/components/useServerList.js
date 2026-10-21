import { useEffect, useRef, useState } from 'react';
import { PAGE_SIZES } from './DataList';

/**
 * The state behind a ServerDataList: the query (page, size, sort, search)
 * and the page fetched for it. A search waits a moment for the typing to
 * stop; an answer to an older query is dropped. `refresh` fetches the same
 * page again, after a change made on the page.
 *
 * @param {(query) => Promise<{ rows: object[], total: number }>} fetchPage
 * @param {{ sort?: { field, direction }, deps?: any[] }} options
 */
export const useServerList = (fetchPage, { sort = null, deps = [] } = {}) => {
  const [query, setQuery] = useState({ page: 0, pageSize: PAGE_SIZES[0], sort, search: '' });
  const [result, setResult] = useState({ rows: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [round, setRound] = useState(0);
  const latest = useRef(0);

  useEffect(() => {
    const ask = latest.current + 1;
    latest.current = ask;
    setLoading(true);
    const timer = setTimeout(() => {
      fetchPage(query).then(
        (page) => { if (latest.current === ask) { setResult(page); setError(null); } },
        (e) => { if (latest.current === ask) setError(e.reason || e.message); },
      ).finally(() => { if (latest.current === ask) setLoading(false); });
    }, query.search ? 250 : 0);
    return () => clearTimeout(timer);
  }, [JSON.stringify(query), round, ...deps]);

  return { ...result, loading, error, query, onQueryChange: setQuery, refresh: () => setRound((r) => r + 1) };
};
