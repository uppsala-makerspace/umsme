import { fieldOptions } from '/imports/common/lib/modelOptions';

export const TYPES = fieldOptions('group', 'type');
export const JOIN_POLICIES = fieldOptions('group', 'joinPolicy');
const labelOf = (options) => (value) => options.find((o) => o.value === value)?.label || value;
export const typeLabel = labelOf(TYPES);
export const joinPolicyLabel = labelOf(JOIN_POLICIES);
