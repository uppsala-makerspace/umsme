import { Meteor } from 'meteor/meteor';
import { Members } from '/collections/members.js';
import { Memberships } from '/collections/memberships.js';
import { MessageTemplates } from '/collections/templates.js';
import './methods/import';
import './methods/update';

Meteor.startup(() => {
  // code to run on server at startup
});