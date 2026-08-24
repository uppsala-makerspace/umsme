import './initTabular';
import 'meteor/aldeed:collection2/static';
import Tabular from 'meteor/aldeed:tabular';
import { Roles } from 'meteor/roles';
import { Payments } from '/imports/common/collections/payments';
import { models } from "/imports/common/lib/models";
import { extractor, dateViewFunction } from "/imports/common/lib/fieldsUtils";

const appendColumns = [{
  title: 'Kind',
  render(value, type, doc) {
    // A webshop purchase is recognised by its linked item, never by the ws:
    // prefix in the message (Swish truncates at 50 characters, and a manual
    // payer writes their own message).
    //
    // The other two are told apart the same way the Memberships tab selects: a
    // linked membership is what proves a payment was for membership. Without one
    // it is either marked `other` (clay and the like, from before the webshop) or
    // simply not treated yet — calling either "Membership" would be a guess.
    let label = 'Unclassified';
    let cls = 'default';
    if (doc.storeItem) {
      label = `Purchase${doc.itemCode ? `: ${doc.itemCode}` : ''}`;
      cls = 'info';
    } else if (doc.other) {
      label = 'Other';
      cls = 'warning';
    } else if (doc.membership) {
      label = 'Membership';
      cls = 'primary';
    }
    return new Spacebars.SafeString(`<span class="label label-${cls}">${label}</span>`);
  }
}, {
  title: 'Status',
  render(value, type, doc) {
    // A purchase has no membership to link, so without this case every purchase
    // would sit red and "Untreated" for ever.
    if (doc.storeItem) {
      return new Spacebars.SafeString('<span class="label label-success">Purchase</span>');
    }
    let niceValue = 'Untreated';
    let valueClass = 'danger';
    if (doc.membership) {
      niceValue = 'Treated';
      valueClass = 'success';
    } else if (doc.other) {
      niceValue = 'Other';
      valueClass = 'warning';
    }
    return new Spacebars.SafeString(`<span class="label label-${valueClass}">${niceValue}</span>`);
  }
}, {
  data: 'Link',
  render: function (value, type, doc) {
    const link = `/payment/${doc._id}`;
    return new Spacebars.SafeString(`<a target="_blank" href="${link}">Open&nbsp;↗</a>`);
  }
}];

const enhanceColumns = [
  {
    data: 'date',
    sortOrder: 0,
    sortDirection: 'descending',
    render: dateViewFunction(true)
  }
];

const filteredFields = ['member', 'hash', 'membership', 'other', 'mobile', 'name', 'externalId', 'initiatedBy', 'storeItem', 'itemCode'];

const tableDefaults = {
  // storeItem/itemCode are filtered out of the columns but the renderers above
  // need them, hence extraFields.
  extraFields: ['membership', 'other', 'storeItem', 'itemCode'],
  autoWidth: false,
  pageLength: 50,
  collection: Payments,
  order: [[2, "desc"]],
  allow: (userID) => userID && Roles.userIsInRoleAsync(userID, ['admin', 'board'])
};

new Tabular.Table({
  ...tableDefaults,
  name: "ManualPayments",
  columns: extractor(models.payment, { filter: filteredFields, append: appendColumns, enhance: enhanceColumns }),
  changeSelector(selector) {
    return { ...selector, externalId: { $exists: false } };
  }
});

new Tabular.Table({
  ...tableDefaults,
  name: "AutomaticPayments",
  columns: extractor(models.payment, { filter: [...filteredFields, 'clarification'], append: appendColumns, enhance: enhanceColumns }),
  changeSelector(selector) {
    return { ...selector, externalId: { $exists: true } };
  }
});
// Split views so the treasurer can look at one class at a time. Same selector
// trick as ManualPayments/AutomaticPayments above: a purchase is a payment with
// a linked store item.
new Tabular.Table({
  ...tableDefaults,
  name: "StorePayments",
  columns: extractor(models.payment, { filter: [...filteredFields, 'clarification'], append: appendColumns, enhance: enhanceColumns }),
  changeSelector(selector) {
    return { ...selector, storeItem: { $exists: true } };
  }
});

new Tabular.Table({
  ...tableDefaults,
  name: "MembershipPayments",
  columns: extractor(models.payment, { filter: filteredFields, append: appendColumns, enhance: enhanceColumns }),
  changeSelector(selector) {
    // A linked membership is the proof, and it subsumes the exclusions one might
    // reach for: an `other` payment never gets a membership link, and a webshop
    // purchase gets none either (processStorePurchase creates no membership). So
    // no conditions on `other` or `storeItem` — adding them would only suggest
    // they were needed.
    //
    // This deliberately leaves out payments that are certainly for membership but
    // whose membership could not be created (processPayment returned an error, so
    // `paymentError` is set on the member). Those need attention rather than
    // filing, and they remain visible under Automatic, flagged Untreated.
    return { ...selector, membership: { $exists: true } };
  }
});
