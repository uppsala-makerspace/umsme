import { models } from './models';

const dateViewFunction = function (value) {
  if (value) {
    const now = new Date();
    const inTwoWeeks = new Date();
    inTwoWeeks.setDate(inTwoWeeks.getDate()+14);
    const valueClass = value > inTwoWeeks ? 'success' : (value > now ? 'warning' : 'danger');
    const niceValue = moment(value).format("YYYY-MM-DD");
    return new Spacebars.SafeString(`<span class="label label-${valueClass}">${niceValue}</span>`);
  } else {
    return '';
  }
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
        label: model[key].label
      };
      if (model[key].type === Date) {
        obj.fn = dateViewFunction;
      }
      if (key === 'family') {
        obj.fn = familyFunction;
      }
      return obj;
    });

// List them explicitly to make it easier to read code and give typeahead support.
export const fields = {
  member: extractFields(models.member),
  membership: extractFields(models.membership),
};