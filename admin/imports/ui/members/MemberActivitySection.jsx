import React, { useEffect, useState } from 'react';
import { MemberActivity } from './MemberActivity';
import { memberActivity } from './data';

/**
 * The Activity tab of a member's page: fetches the activity, shows it. The
 * doors are the member's own until the whole family is asked for.
 */
export const MemberActivitySection = ({ memberId }) => {
  const [scope, setScope] = useState('member');
  const [activity, setActivity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  useEffect(() => { setScope('member'); setActivity(null); }, [memberId]);
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    memberActivity(memberId, scope)
      .then((result) => { if (!cancelled) setActivity(result); })
      .catch((e) => { if (!cancelled) setError(e.reason || e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [memberId, scope]);
  return <MemberActivity activity={activity} loading={loading} error={error} onScope={setScope} />;
};
