import { MessageTemplateList } from './MessageTemplateList';

const templates = [
  { _id: 't1', name: 'Välkommen', type: 'welcome', membershiptype: 'member', membertype: 'normal', auto: false, deprecated: false },
  { _id: 't2', name: 'Bekräftelse labb', type: 'confirmation', membershiptype: 'lab', auto: true, deprecated: false },
  { _id: 't3', name: 'Påminnelse', type: 'reminder', auto: false, deprecated: false },
  { _id: 't4', name: 'Påminnelse (gammal)', type: 'reminder', auto: false, deprecated: true },
  { _id: 't5', name: 'Storage: warning', type: 'storageWarning', membershiptype: 'lab', auto: true, deprecated: false },
];

export default {
  title: 'Message templates/MessageTemplateList',
  component: MessageTemplateList,
  args: { loading: false, templates },
};

export const Templates = {};

export const Loading = { args: { loading: true, templates: [] } };

export const NoTemplates = { args: { templates: [] } };
