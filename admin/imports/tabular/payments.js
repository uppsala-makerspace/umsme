import './initTabular';
import 'meteor/aldeed:collection2/static';
import Tabular from 'meteor/aldeed:tabular';
import { Roles } from 'meteor/roles';
import { Payments } from '/imports/common/collections/payments';
import { models } from "/imports/common/lib/models";
import { extractor, dateViewFunction } from "/imports/common/lib/fieldsUtils";

const appendColumns = [{
  title: 'Status',
  render(value, type, doc) {
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

const filteredFields = ['member', 'hash', 'membership', 'other', 'mobile', 'name', 'externalId', 'initiatedBy'];

const tableDefaults = {
  extraFields: ['membership', 'other'],
  autoWidth: false,
  pageLength: 50,
  collection: Payments,
  order: [[2, "desc"]],
  allow: (userID) => userID && Roles.userIsInRoleAsync(userID, 'admin')
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