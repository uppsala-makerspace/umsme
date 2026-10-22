import React from 'react';
import { createRoot } from 'react-dom/client';
import { Meteor } from 'meteor/meteor';
import { reactRoute } from './react/reactRoute';
import { App } from './react/App';
import { Home } from '/imports/ui/shell/Home';
import './ui/members';
import './ui/membership';
import './ui/message';
import './ui/storage';
import './ui/stats';
import './ui/revenue';
import './ui/messagetemplate';
import './ui/mail';
import './ui/lock';
import './ui/history';
import './ui/admin';
import './ui/bank';
import './ui/door';
import './ui/check';
import './ui/users';
import './ui/liability';
import './ui/certificates';
import './ui/expenses';
import './ui/groups';
import './ui/workshops';
import './ui/spaces';
import './ui/storeitems';
import './ui/accounting';
import './ui/announcement';
import './ui/pending';
import './ui/reminders';
import './ui/excluded';

reactRoute('/', 'home', Home);

Meteor.startup(() => {
  createRoot(document.getElementById('app')).render(<App />);
});
