import React from 'react';
import { AnnouncementList } from './AnnouncementList';
import { useAnnouncementList } from './data';

export const AnnouncementListPage = () => <AnnouncementList {...useAnnouncementList()} />;
