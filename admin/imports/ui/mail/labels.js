/** Who a group mail goes to, as the send page offers it. */
export const RECIPIENT_GROUPS = [
  ['members', 'Current members'],
  ['labmembers', 'Current labmembers'],
  ['yearmembers', 'Members current year'],
  ['recentmembers', 'Members last year'],
];

export const groupLabel = (value) => RECIPIENT_GROUPS.find(([v]) => v === value)?.[1] || value;

/** A send date with its time, as the lists show it. */
export const sentAt = (date) => (date ? new Date(date).toLocaleString('sv-SE', { dateStyle: 'short', timeStyle: 'short' }) : '');

/** A group mail's state as a chip shows it. */
export const MAIL_STATUS = {
  sending: { label: 'Sending', color: 'info' },
  sent: { label: 'Sent', color: 'success' },
  interrupted: { label: 'Interrupted', color: 'warning' },
};
