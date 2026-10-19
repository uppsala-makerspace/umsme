import { AnnouncementList } from './AnnouncementList';

const announcements = [
  { _id: 'a1', type: 'newsletter', subjectSv: 'Nyhetsbrev hösten', status: 'sent', createdAt: new Date(2026, 8, 18), sentAt: new Date(2026, 8, 20, 9, 30) },
  { _id: 'a2', type: 'information', subjectSv: 'Stängt under jul', status: 'draft', createdAt: new Date(2026, 9, 17) },
];

export default {
  title: 'Announcements/AnnouncementList',
  component: AnnouncementList,
  args: { loading: false, announcements },
};

export const Announcements = {};
export const Loading = { args: { loading: true, announcements: [] } };
export const NoAnnouncements = { args: { announcements: [] } };
