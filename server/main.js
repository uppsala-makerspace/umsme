import { Meteor } from 'meteor/meteor';
import { Members } from '/collections/members';
import { Memberships } from '/collections/memberships';
import { MessageTemplates } from '/collections/templates';
import { Messages } from '/collections/messages';
import './methods/import';
import './methods/update';
import './methods/mail';

Meteor.startup(() => {
  // code to run on server at startup
});