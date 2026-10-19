import React from 'react';
import { GroupList } from './GroupList';
import { useGroupList } from './data';

export const GroupListPage = () => <GroupList {...useGroupList()} />;
