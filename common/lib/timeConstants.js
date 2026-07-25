// Shared time windows used across admin/app/payment.
// Day-based (not calendar-month) for predictability — see `setDate()` arithmetic.
export const MEMBERSHIP_RENEWAL_WINDOW_DAYS = 30;

// Grace period granted to first-time members so they can complete
// certification training before their access expires.
export const FIRST_TIME_MEMBER_GRACE_DAYS = 14;

// Length of the period bought by a mid-period upgrade paid at full price,
// counted from the payment date rather than extending the old end date. The two
// extra months compensate for the membership value given up by upgrading early.
// Shared by the lab upgrade (S1) and the family upgrades (S3a/S3b) so the two
// can't drift apart.
export const UPGRADE_MONTHS = 14;

// Upper bound on the lab span (start → labend) of the controlling lab
// membership that still counts as a "quarterly" lab. The system only issues
// 3-month (quarterly) or 12-month (yearly) lab spans, so 180 days sits safely
// between. Used to detect legacy "yearly base + quarterly lab" memberships
// stored as a single labandmember document.
export const QUARTERLY_LAB_MAX_DAYS = 180;
