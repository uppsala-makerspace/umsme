import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import './ExpenseList';
import './ExpenseView';
import './ExpenseAccountList';
import './ExpenseAccountAdd';
import './ExpenseAccountView';

FlowRouter.route('/expenses', {
  name: 'expenses',
  action() {
    this.render('AppBody', { main: 'ExpenseList' });
  },
});

FlowRouter.route('/expenses/confirm', {
  name: 'expensesConfirm',
  action() {
    this.render('AppBody', { main: 'ExpenseList' });
  },
});

FlowRouter.route('/expenses/reimburse', {
  name: 'expensesReimburse',
  action() {
    this.render('AppBody', { main: 'ExpenseList' });
  },
});

FlowRouter.route('/expense/:_id', {
  name: 'expenseview',
  action() {
    this.render('AppBody', { main: 'ExpenseView' });
  },
});

FlowRouter.route('/expenses/accounts', {
  name: 'expenseaccounts',
  action() {
    this.render('AppBody', { main: 'ExpenseAccountList' });
  },
});

FlowRouter.route('/expenses/accounts/add', {
  name: 'addexpenseaccount',
  action() {
    this.render('AppBody', { main: 'ExpenseAccountAdd' });
  },
});

FlowRouter.route('/expenseaccount/:_id', {
  name: 'expenseaccountview',
  action() {
    this.render('AppBody', { main: 'ExpenseAccountView' });
  },
});
