import 'datatables.net-bs/css/dataTables.bootstrap.css';
import 'bootstrap/dist/css/bootstrap.min.css'
import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import './ui/members';
import './ui/membership';
import './ui/message';
import './ui/family';
import './ui/storage';
import './ui/stats';
import './ui/messagetemplate';
import './ui/mail';
import './ui/lock';
import './ui/history';
import './ui/admin';
import './ui/bank';
import './ui/door';
import './ui/check';
import './layouts/AppBody.html';
import './layouts/Home.html';
import './ui/reactlogin';
import { Accounts } from 'meteor/accounts-base';
import { AutoFormThemeBootstrap3 } from 'meteor/communitypackages:autoform-bootstrap3/static';
AutoFormThemeBootstrap3.load();


Accounts.ui.config({
/*  requestPermissions: {
    facebook: ["user_likes"],
    github: ["user", "repo"],
  },
  requestOfflineToken: {
    google: true,
  },*/
  passwordSignupFields: "USERNAME_AND_OPTIONAL_EMAIL",
});

//import './main.html';

FlowRouter.route('/', {
  name: 'home',
  action() {
    this.render('AppBody', {main: 'Home'});
  }
});

/*
Template.hello.onCreated(function helloOnCreated() {
  // counter starts at 0
  Meteor.subscribe('members');
  this.counter = new ReactiveVar(0);
});

Template.hello.helpers({
  counter() {
    return Template.instance().counter.get();
  },
  members() {
    return Members.find();
  }
});

Template.hello.events({
  'click button'(event, instance) {
    // increment the counter when button is clicked
    instance.counter.set(instance.counter.get() + 1);
  },
});*/
