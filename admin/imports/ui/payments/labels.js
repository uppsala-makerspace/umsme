/** How a payment is filed, as a chip: label and colour. */
export const KIND = {
  purchase: { label: 'Purchase', color: 'info' },
  membership: { label: 'Membership', color: 'primary' },
  other: { label: 'Other', color: 'warning' },
  untreated: { label: 'Unclassified', color: 'default' },
};
/** Whether a payment still needs filing. */
export const STATUS = {
  purchase: { label: 'Purchase', color: 'success' },
  membership: { label: 'Treated', color: 'success' },
  other: { label: 'Other', color: 'warning' },
  untreated: { label: 'Untreated', color: 'error' },
};

/** A date as the day it falls on here, YYYY-MM-DD; '' for none. */
export const day = (date) => (date ? new Date(date).toLocaleDateString('sv-SE') : '');
