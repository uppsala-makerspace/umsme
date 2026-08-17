import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import './StoreItemList';
import './StoreItemAdd';
import './StoreItemView';

FlowRouter.route('/storeitems', {
  name: 'storeitems',
  action() {
    this.render('AppBody', { main: 'StoreItemList' });
  },
});

FlowRouter.route('/storeitems/add', {
  name: 'addstoreitem',
  action() {
    this.render('AppBody', { main: 'StoreItemAdd' });
  },
});

FlowRouter.route('/storeitem/:_id', {
  name: 'storeitemview',
  action() {
    this.render('AppBody', { main: 'StoreItemView' });
  },
});
