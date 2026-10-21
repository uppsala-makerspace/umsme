import React from 'react';
import { useServerList } from '../components/useServerList';
import { MemberList } from './MemberList';
import { memberPage } from './data';

export const ExcludedPage = () => (
  <MemberList
    title="Excluded members" note="Members the board has excluded." empty="Nobody is excluded."
    {...useServerList(memberPage('excluded'), { sort: { field: 'name', direction: 'asc' } })}
  />
);
