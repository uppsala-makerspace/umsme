import { fieldOptions } from '/imports/common/lib/modelOptions';

export const TYPES = fieldOptions('announcement', 'type');
export const typeLabel = (value) => TYPES.find((o) => o.value === value)?.label || value;
export const statusLabel = (value) => (value === 'sent' ? 'Sent' : 'Draft');

/** A moment as YYYY-MM-DD HH:mm, here; '' for none. */
export const moment = (date) => (date ? new Date(date).toLocaleString('sv-SE', { dateStyle: 'short', timeStyle: 'short' }) : '');
