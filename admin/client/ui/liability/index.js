import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import "./LiabilityDocumentList";
import "./LiabilityDocumentAdd";
import "./LiabilityDocumentView";

FlowRouter.route('/liability', {
  name: 'liability',
  action() {
    this.render('AppBody', {main: 'LiabilityDocumentList'});
  }
});

FlowRouter.route('/liability/add', {
  name: 'addliability',
  action() {
    this.render('AppBody', {main: 'LiabilityDocumentAdd'});
  }
});

FlowRouter.route('/liability/:_id', {
  name: 'liabilityview',
  action() {
    this.render('AppBody', {main: 'LiabilityDocumentView'});
  }
});
