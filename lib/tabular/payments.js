import './initTabular';
import 'meteor/aldeed:collection2/static';
import Tabular from 'meteor/aldeed:tabular';
import { Payments } from '../../collections/payments';
import { models } from "../models";
import { extractor, dateViewFunction } from "../fieldsUtils";

const paymentDefaults = {
  filter: ['member', 'hash', 'membership', 'other', 'mobile', 'name'],
  append: [{
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
  }],
  enhance: [
    {
      data: 'date',
      sortOrder: 0,
      sortDirection: 'descending',
      render: dateViewFunction(true)
    }
  ]
};


new Tabular.Table({
  name: "Payments",
  extraFields: ['membership', 'other'],
  autoWidth: false,
  pageLength: 50,
  collection: Payments,
  order: [[2, "desc"]],
  columns: extractor(models.payment, paymentDefaults),
  allow(userID) {
    return userID !== null;
  }
});