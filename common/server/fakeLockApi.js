import { Mongo } from 'meteor/mongo';

/**
 * The state of the fake door lock API (settings "lockApi": "fake"): what the
 * Danalock service would hold, the users, their calendars (access end dates)
 * and links, and the door's log. One document, id 'danalock', written by the
 * demo and e2e seeds and changed by admin's lock pages. Development only.
 */
export const FakeLockState = new Mongo.Collection('fakeLockApi');
export const FAKE_LOCK_ID = 'danalock';
