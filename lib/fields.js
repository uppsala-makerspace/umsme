import { models } from './models';

const dateViewFunction = function (value) { return moment(value).format("YYYY-MM-DD"); };
const extractFields = (model) => Object.keys(model)
    .filter((key) => {
      return key != '_id';
    })
    .map(key => {
      const obj = {
        key,
        label: model[key].label
      };
      if (model[key].type === Date) {
        obj.fn = dateViewFunction;
      }
      return obj;
    });

// List them explicitly to make it easier to read code and give typeahead support.
export const fields = {
  member: extractFields(models.member),
  membership: extractFields(models.membership)
};