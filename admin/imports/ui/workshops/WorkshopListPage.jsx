import React from 'react';
import { WorkshopList } from './WorkshopList';
import { useWorkshopList } from './data';
import { useChoices } from '../groups/choices';

export const WorkshopListPage = () => {
  const list = useWorkshopList();
  const { groupName } = useChoices();
  return <WorkshopList {...list} groupName={groupName} />;
};
