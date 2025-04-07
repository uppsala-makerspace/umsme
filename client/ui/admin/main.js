import 'datatables.net-bs/css/dataTables.bootstrap.css';
import 'bootstrap/dist/css/bootstrap.min.css'
import '../../layouts/AppBody.html';
import './main.css';
import { Accounts } from 'meteor/accounts-base';
import { AutoFormThemeBootstrap3 } from 'meteor/communitypackages:autoform-bootstrap3/static';
AutoFormThemeBootstrap3.load();

Accounts.ui.config({
  passwordSignupFields: "USERNAME_AND_OPTIONAL_EMAIL",
});
