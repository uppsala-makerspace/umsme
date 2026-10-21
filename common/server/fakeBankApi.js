import { Mongo } from 'meteor/mongo';

/**
 * The state of the fake bank proxy (settings "bankproxy": "fake"): the
 * account's transactions as the Swedbank proxy returns them, and the sign-in
 * state per personal number. One document, id 'swedbank', written by the
 * demo and e2e seeds. Development only.
 */
export const FakeBankState = new Mongo.Collection('fakeBankApi');
export const FAKE_BANK_ID = 'swedbank';
