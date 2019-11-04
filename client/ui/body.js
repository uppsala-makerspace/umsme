import { Template } from 'meteor/templating';
import { Members } from '../../collections/members.js';

import './body.html';

Template.body.helpers({
  members() {
    return Members.find({});
  }
});


Template.body.events({
  'click .addM_button'(event) {
    const obj = {createdAt: new Date()};
    const fields = ['mid', 'name', 'email', 'type', 'member', 'lab', 'lock'];
    fields.forEach((k) => {
      obj[k] = document.getElementById(`addM_${k}`).value;
    });

    if (obj.mid === '') {
      obj.mid = Math.floor(Math.random()*10000);
    }
    console.dir(obj);
    return;
    // Insert a task into the collection
    Members.insert(obj);

    // Clear form
    fields.forEach((k) => {
      document.getElementById(`addM_${k}`).value = '';
    });
  },
});