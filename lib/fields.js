import { models } from './models';
import { reminderDays } from './rules';

const dateViewFunction = function(regular) {
  return function (value) {
    if (value) {
      const now = new Date();
      const reminderTime = new Date();
      reminderTime.setDate(reminderTime.getDate() + reminderDays);
      const valueClass = regular ? 'default' : value > reminderTime ? 'success' : (value > now ? 'warning' : 'danger');
      const niceValue = moment(value).format("YYYY-MM-DD");
      return new Spacebars.SafeString(`<span class="label label-${valueClass}">${niceValue}</span>`);
    } else {
      return '';
    }
  };
};

const familyFunction = function(value, obj) {
  if (obj.family) {
    if (!obj.infamily) {
      return 'Paying';
    } else {
      return 'Member';
    }
  }
  return '';
};
const extractFields = (model) => Object.keys(model)
    .filter((key) => {
      return key != '_id' && key != 'infamily';
    })
    .map(key => {
      const obj = {
        key,
        label: model[key].label,
        originalType: model[key].type
      };
      if (model[key].type === Date) {
        obj.fn = dateViewFunction();
      }
      if (key === 'family') {
        obj.fn = familyFunction;
      }
      return obj;
    });

const filter = (fields, keys) => fields.filter(field => keys.indexOf(field.key) === -1);
const enhance = (fields, overrides) => fields.map(field => {
  const override = overrides.find((o) => o.key === field.key);
  if (override) {
    Object.assign(field, override);
  }
  return field;
});

const append = (fields, objOrArr) => {
  if (Array.isArray(objOrArr)) {
    return fields.concat(objOrArr);
  }
  fields.push(objOrArr);
  return fields;
};

const extractor = (model, defaultParams) => {
  let fields = extractFields(model);
  const extractorFn = (params = {}) => {
    if (params.filter) {
      fields = filter(fields, params.filter);
    }
    if (params.enhance) {
      fields = enhance(fields, params.enhance);
    }
    if (params.append) {
      fields = append(fields, params.append);
    }
    return fields;
  };
  if (defaultParams) {
    extractorFn(defaultParams);
  }
  return extractorFn;
};

const paymentDefaults = {
  filter: ['member', 'hash', 'membership', 'other'],
  append: {
    label: 'Status',
    fn(value, obj) {
      let niceValue = 'Untreated';
      let valueClass = 'danger';
      if (obj.membership) {
        niceValue = 'Treated';
        valueClass = 'success';
      } else if (obj.other) {
        niceValue = 'Other';
        valueClass = 'warning';
      }
      return new Spacebars.SafeString(`<span class="label label-${valueClass}">${niceValue}</span>`);
    }
  },
  enhance: [
    {
      key: 'date',
      sortOrder: 0,
      sortDirection: 'descending',
      fn: dateViewFunction(true)
    }
  ]
};

const membershipDefaults = {
  filter: ['mid', 'pid'],
  enhance: [{
    key: 'start',
    sortOrder: 0,
    sortDirection: 'descending',
  }],
  append: [{
    label: 'Payment',
    fn(value, obj) {
      if (obj.pid) {
        return new Spacebars.SafeString(`<span class="label label-success">Bank</span>`);
      }
    }
  }]
};

const memberDefaults = {
  enhance: [{
    key: 'mid',
    fn(value, obj) {
      return new Spacebars.SafeString(`<span class="label label-default">${value}</span>`);
    }
  }, {
    key: 'member',
    sortOrder: 0,
    sortDirection: 'descending',
  }]
};


// List them explicitly to make it easier to read code and give typeahead support.
export const fields = {
  member: extractor(models.member, memberDefaults),
  membership: extractor(models.membership, membershipDefaults),
  template: extractFields(models.template),
  message: extractFields(models.message),
  payment: extractor(models.payment, paymentDefaults),
  filterOut: filter,
  enhance,
  append,
  dateFn: dateViewFunction
};