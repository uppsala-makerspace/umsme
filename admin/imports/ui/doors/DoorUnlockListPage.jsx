import React, { useState } from 'react';
import { useServerList } from '../components/useServerList';
import { DoorUnlockList } from './DoorUnlockList';
import { doorUnlocksPage } from './data';

export const DoorUnlockListPage = () => {
  const [showNames, setShowNames] = useState(false);
  return (
    <DoorUnlockList
      showNames={showNames} onShowNamesChange={setShowNames}
      {...useServerList(doorUnlocksPage, { sort: { field: 'timestamp', direction: 'desc' } })}
    />
  );
};
