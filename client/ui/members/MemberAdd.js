import { Template } from 'meteor/templating';
import { Members } from '../../../collections/members.js';

import './MemberAdd.html';

Template.MemberAdd.helpers({
  Members() {
    return Members;
  }
});