import React, { useEffect } from 'react';
import { useQueryParam } from '../navigation';
import { Activity, activityPath } from './Activity';
import { DoorStatsPage } from './DoorStatsPage';
import { DoorUnlockListPage } from './DoorUnlockListPage';

/** /activity: the door statistics and the door unlocks, as tabs (?tab=unlocks). */
export const ActivityPage = () => {
  const [tab, setTab] = useQueryParam('tab');
  return (
    <Activity
      tab={tab || 'statistics'} onTab={(next) => setTab(next === 'statistics' ? '' : next)}
      statistics={<DoorStatsPage />} unlocks={<DoorUnlockListPage />}
    />
  );
};

/**
 * The old addresses, /door and /doorunlocks, kept for bookmarks: on to their
 * tab, replacing the old address, so that Back does not land on it again.
 */
const MovedTo = ({ tab }) => {
  useEffect(() => { window.location.replace(activityPath(tab)); }, []);
  return null;
};
export const DoorStatsMoved = () => <MovedTo tab="statistics" />;
export const DoorUnlocksMoved = () => <MovedTo tab="unlocks" />;
