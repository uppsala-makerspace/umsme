import { models } from './models';

/**
 * The choices models.js gives a field, as [{ value, label }]. The model may
 * list them as an array of { label, value } or an object of value: label.
 */
export const fieldOptions = (model, field) => {
  const options = models[model][field].autoform?.options;
  if (Array.isArray(options)) return options.map(({ value, label }) => ({ value, label }));
  return Object.entries(options || {}).map(([value, label]) => ({ value, label }));
};
