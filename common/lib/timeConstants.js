// Shared time windows used across admin/app/payment.
// Day-based (not calendar-month) for predictability — see `setDate()` arithmetic.
export const MEMBERSHIP_RENEWAL_WINDOW_DAYS = 30;

// Grace period granted to first-time members so they can complete
// certification training before their access expires.
export const FIRST_TIME_MEMBER_GRACE_DAYS = 14;

// Upper bound on the lab span (start → labend) of the controlling lab
// membership that still counts as a "quarterly" lab. The system only issues
// 3-month (quarterly) or 12-month (yearly) lab spans, so 180 days sits safely
// between. Used to detect legacy "yearly base + quarterly lab" memberships
// stored as a single labandmember document.
export const QUARTERLY_LAB_MAX_DAYS = 180;
