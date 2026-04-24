// Shared time windows used across admin/app/payment.
// Day-based (not calendar-month) for predictability — see `setDate()` arithmetic.
export const MEMBERSHIP_RENEWAL_WINDOW_DAYS = 30;

// Grace period granted to first-time members so they can complete
// certification training before their access expires.
export const FIRST_TIME_MEMBER_GRACE_DAYS = 14;
