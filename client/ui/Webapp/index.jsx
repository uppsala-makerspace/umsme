import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import route from "/client/ui/Webapp/route";
import { LoginForm } from './imports/components/LoginForm';
import { RegisterForm } from './imports/components/RegisterForm';
import { LoggedIn } from './imports/components/LoggedIn';

FlowRouter.route('/', {
  name: 'webbapp',
  /*  action() {
    route('start', () => <div>Here be dragons</div>);
  },*/
  triggersEnter: [(context, redirect) => {
    redirect('/login');
  }]
});

FlowRouter.route('/register', {
  action() {
    route('register', RegisterForm);
  }
});

FlowRouter.route('/login', {
  action() {
    route('login', LoginForm);
  }
});

FlowRouter.route('/loggedIn',{
  action(){
    route('loggedIn', LoggedIn);
  }
});