import { Meteor } from 'meteor/meteor';
import { danalock } from './danalock';
import { fakeLock } from './fakeLock';

/** The door lock's API: Danalock, or the fake one when the settings say "lockApi": "fake". */
export const lockApi = () => (Meteor.settings.lockApi === 'fake' ? fakeLock : danalock);
