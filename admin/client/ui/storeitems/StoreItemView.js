import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import { StoreItems } from '/imports/common/collections/storeItems';
import { Payments } from '/imports/common/collections/payments';
import { hasFixedPrice } from '/imports/common/lib/storeRules';
import './StoreItemView.html';

const itemId = () => FlowRouter.getParam('_id');

const purchases = () => Payments.find({ storeItem: itemId() });

Template.StoreItemView.onCreated(function () {
  Meteor.subscribe('storeItems');
  Meteor.subscribe('payments');
  this.uploading = new ReactiveVar(false);
});

Template.StoreItemView.helpers({
  StoreItems() {
    return StoreItems;
  },
  item() {
    return StoreItems.findOne(itemId());
  },
  isHidden() {
    return StoreItems.findOne(itemId())?.status === 'hidden';
  },
  buyerSetsPrice() {
    const item = StoreItems.findOne(itemId());
    return !!item && !hasFixedPrice(item);
  },
  isDeletable() {
    const item = StoreItems.findOne(itemId());
    if (!item) return false;
    if (item.imageFileId) return false;
    return purchases().count() === 0;
  },
  deleteBlockedReason() {
    const item = StoreItems.findOne(itemId());
    if (item?.imageFileId) return 'Remove the image before the item can be deleted.';
    return 'This item has been bought. Set its status to hidden instead — deleting it '
      + 'would leave payments pointing at nothing, in the purchase history and in the '
      + 'bookkeeping export.';
  },
  imageUrl() {
    const item = StoreItems.findOne(itemId());
    if (!item?.imageFileId) return '';
    return `/api/store-items/${item._id}/image?v=${encodeURIComponent(item.imageFileId)}`;
  },
  uploading() {
    return Template.instance().uploading.get();
  },
  uploadingAttr() {
    return Template.instance().uploading.get() ? 'disabled' : '';
  },
  hasPurchases() {
    return purchases().count() > 0;
  },
  purchaseCount() {
    return purchases().count();
  },
  purchaseTotal() {
    return purchases().fetch().reduce((sum, p) => sum + (p.amount || 0), 0);
  },
});

Template.StoreItemView.events({
  'click .deleteStoreItem': function () {
    if (!confirm('Delete this store item?')) return;
    StoreItems.remove(itemId(), (err) => {
      if (err) {
        alert('Delete failed: ' + err.message);
        return;
      }
      FlowRouter.go('/storeitems');
    });
  },
  'click .uploadImage': function (event, template) {
    const input = template.find('.imageFileInput');
    const file = input.files && input.files[0];
    if (!file) {
      alert('Choose an image file first.');
      return;
    }
    template.uploading.set(true);
    const reader = new FileReader();
    reader.onload = () => {
      // reader.result is a data: URL; the method wants raw base64.
      const base64 = String(reader.result).split(',')[1] || '';
      Meteor.call('adminStoreItems.uploadImage', itemId(), base64, file.type, (err) => {
        template.uploading.set(false);
        if (err) {
          alert('Upload failed: ' + err.message);
          return;
        }
        input.value = '';
      });
    };
    reader.onerror = () => {
      template.uploading.set(false);
      alert('Could not read the file.');
    };
    reader.readAsDataURL(file);
  },
  'click .removeImage': function () {
    if (!confirm('Remove the image?')) return;
    Meteor.call('adminStoreItems.removeImage', itemId(), (err) => {
      if (err) alert('Remove failed: ' + err.message);
    });
  },
});
