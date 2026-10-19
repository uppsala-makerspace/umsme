import { Meteor } from 'meteor/meteor';
import { swedbankProxy } from './swedbankProxy';
import { fakeBank } from './fakeBank';

/** The bank: the umsme-bank proxy, or the fake one when the settings say "bankproxy": "fake". */
export const bankApi = () => (Meteor.settings.bankproxy === 'fake' ? fakeBank : swedbankProxy);
