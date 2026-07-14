import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import './BankExport';

FlowRouter.route('/accounting/bankexport', {
  name: 'bankexport',
  action() {
    this.render('AppBody', { main: 'BankExport' });
  },
});
