import React, { useEffect, useState } from 'react';
import { DoorStats } from './DoorStats';
import { doorVisitStats } from './data';

/**
 * /door: the door visits. Fetches again when the view or period changes, not
 * when what to count does (the answer has both); the last answer stays shown
 * meanwhile.
 */
export const DoorStatsPage = () => {
  const [query, setQuery] = useState({ view: 'day' });
  const [count, setCount] = useState('visits');
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    doorVisitStats(query)
      .then((result) => { if (!cancelled) setStats(result); })
      .catch((e) => { if (!cancelled) setError(e.reason || e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [query]);
  return (
    <DoorStats stats={stats} query={query} onQuery={setQuery} count={count} onCount={setCount}
      loading={loading} error={error} />
  );
};
