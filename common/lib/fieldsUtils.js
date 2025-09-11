import { reminderDays } from './rules';
import moment from 'moment';

export const dateViewFunction = function(regular) {
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

const extractFields = (model) => Object.keys(model)
    .filter((key) => {
      return key != '_id';
    })
    .map(key => {
      const obj = {
        data: key,
        title: model[key].label,
        originalType: model[key].type
      };
      if (model[key].type === Date) {
        obj.render = dateViewFunction();
      }

      if (model[key].type === Boolean) {
        obj.fn = (value, obj) => {
          if (obj[key]) {
            return new Spacebars.SafeString('<strong>&check;</strong>');
          }
        }
      }

      return obj;
    });

export const filter = (fields, keys) => fields.filter(field => keys.indexOf(field.data) === -1);
export const enhance = (fields, overrides) => fields.map(field => {
  const override = overrides.find((o) => o.data === field.data);
  if (override) {
    Object.assign(field, override);
  }
  return field;
});

export const append = (fields, objOrArr) => {
  if (Array.isArray(objOrArr)) {
    return fields.concat(objOrArr);
  }
  fields.push(objOrArr);
  return fields;
};

export const extractor = (model, defaultParams) => {
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