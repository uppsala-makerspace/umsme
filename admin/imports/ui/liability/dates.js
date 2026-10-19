/**
 * Dates as the liability pages show and edit them. No Meteor imports, so the
 * pure components and their stories can use these.
 *
 * A version's date is the chosen day at midnight UTC, as admin's date field
 * has always stored it; it is read back in UTC too.
 */

/** A date as YYYY-MM-DD, for the date field and the list. */
export const toDateInput = (date) => (date ? new Date(date).toISOString().substring(0, 10) : '');

/** The value of a date field as a Date at midnight UTC, or null if empty. */
export const fromDateInput = (value) => (value ? new Date(`${value}T00:00:00Z`) : null);
