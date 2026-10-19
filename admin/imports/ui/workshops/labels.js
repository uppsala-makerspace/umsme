import { fieldOptions } from '/imports/common/lib/modelOptions';

export const KINDS = fieldOptions('workshop', 'kind');
export const STATUSES = fieldOptions('workshop', 'status');
const labelOf = (options) => (value) => options.find((o) => o.value === value)?.label || value;
export const kindLabel = labelOf(KINDS);
export const statusLabel = labelOf(STATUSES);

/** What the guideline's missing keys mean, in words. */
export const MISSING = {
  name: 'Swedish name',
  description: 'description',
  image: 'image',
  slackChannel: 'Slack channel',
  groupId: 'steering group',
  groupMembers: 'enough active members in the steering group',
  type: 'type',
  responsibleMemberId: 'responsible',
  parentGroupId: 'parent group',
};
