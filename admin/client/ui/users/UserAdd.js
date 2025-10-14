import { Template } from 'meteor/templating';
import './UserAdd.html';
import { Accounts } from 'meteor/accounts-base';
import { FlowRouter } from 'meteor/ostrio:flow-router-extra';

Template.UserAdd.onCreated(function() {
});

Template.UserAdd.events({
  'click button.addUser': async function (event) {
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    const res = await Meteor.callAsync('serverCreateUser', username, password);
    FlowRouter.go(`/user/${res}`);
  }
});

