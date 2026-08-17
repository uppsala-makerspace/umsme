import { Template } from 'meteor/templating';
import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import { StoreItems } from '/imports/common/collections/storeItems';
import './StoreItemAdd.html';

Template.StoreItemAdd.onCreated(function () {
  Meteor.subscribe('storeItems');
});

Template.StoreItemAdd.helpers({
  StoreItems() {
    return StoreItems;
  },
});

AutoForm.hooks({
  insertStoreItemForm: {
    onSubmit: function (doc) {
      doc.createdAt = new Date();
      StoreItems.insert(doc, (err, id) => {
        if (err) {
          alert('Insert failed: ' + err.message);
          this.done(err);
          return;
        }
        this.done();
        FlowRouter.go(`/storeitem/${id}`);
      });
      return false;
    },
  },
});
