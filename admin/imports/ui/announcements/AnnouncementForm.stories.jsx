import React, { useState } from 'react';
import { fn } from 'storybook/test';
import { AnnouncementForm } from './AnnouncementForm';

const draft = {
  _id: 'a2', type: 'information', subjectSv: 'Stängt under jul', subjectEn: 'Closed over Christmas', status: 'draft', createdAt: new Date(2026, 9, 17),
  bodySv: 'Lokalen är **stängd** 23 december till 2 januari.\n\nGod jul!', bodyEn: 'The premises are **closed** 23 December to 2 January.',
};
const sent = {
  _id: 'a1', type: 'newsletter', subjectSv: 'Nyhetsbrev hösten', status: 'sent', createdAt: new Date(2026, 8, 18), sentAt: new Date(2026, 8, 20, 9, 30), mailId: 'm1',
  bodySv: '# Nyheter\n\nÅrsmötet hålls i mars. Välkommen på städdag i november!',
};
const values = (a) => ({ type: a.type || 'newsletter', subjectSv: a.subjectSv || '', subjectEn: a.subjectEn || '', bodySv: a.bodySv || '', bodyEn: a.bodyEn || '' });

/** Keeps the values, as the page does. */
const Editable = ({ values: initial, ...props }) => {
  const [current, setCurrent] = useState(initial);
  return <AnnouncementForm {...props} values={current} onChange={(field, value) => setCurrent((v) => ({ ...v, [field]: value }))} />;
};

export default {
  title: 'Announcements/AnnouncementForm',
  component: AnnouncementForm,
  render: (args) => <Editable {...args} />,
  args: { isNew: false, announcement: draft, values: values(draft), onSave: fn(), onDelete: fn() },
};

export const NewAnnouncement = { args: { isNew: true, announcement: null, values: values({}) } };
export const Draft = {};
/** Unsaved changes: Send waits for Save. */
export const Unsaved = { args: { dirty: true } };
export const Sent = { args: { announcement: sent, values: values(sent) } };
