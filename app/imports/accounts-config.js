import { Accounts } from 'meteor/accounts-base';


Accounts.config({
  forbidClientAccountCreation : true
});

Accounts.ui.config({
  passwordSignupFields: 'USERNAME_ONLY'
});